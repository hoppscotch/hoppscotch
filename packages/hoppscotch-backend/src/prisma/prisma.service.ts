import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { parseIntSafe } from 'src/utils';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: pg.Pool;
  private readonly schema: string;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const { connectionString, schema, connectionLimit, connectTimeout } =
      PrismaService.parseDatabaseUrl(databaseUrl);

    const pool = new pg.Pool({
      connectionString,
      max: connectionLimit ?? 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: connectTimeout ?? 5000,
    });

    const adapter = new PrismaPg(pool, {
      schema,
    });

    super({
      adapter,
      transactionOptions: {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      },
    });

    this.pool = pool;
    this.schema = schema;
  }

  private static parseDatabaseUrl(databaseUrl: string): {
    connectionString: string;
    schema: string;
    connectionLimit?: number;
    connectTimeout?: number;
  } {
    try {
      const url = new URL(databaseUrl);
      const schema = url.searchParams.get('schema') || 'public';
      const connectionLimit = url.searchParams.get('connection_limit');
      const connectTimeout = url.searchParams.get('connect_timeout');

      // Validate schema name: alphanumeric, underscores, max 63 chars
      const schemaRegex = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;
      if (!schemaRegex.test(schema)) {
        throw new Error(
          `Invalid schema name: "${schema}". Schema must start with a letter or underscore, contain only alphanumeric characters and underscores, and be at most 63 characters long.`,
        );
      }

      url.searchParams.delete('schema');
      url.searchParams.delete('connection_limit');
      url.searchParams.delete('connect_timeout');

      return {
        connectionString: url.toString(),
        schema,
        connectionLimit: parseIntSafe(connectionLimit),
        connectTimeout: parseIntSafe(connectTimeout),
      };
    } catch (error) {
      throw new Error(
        `Invalid DATABASE_URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleInit() {
    try {
      // Verify pool connectivity
      const client = await this.pool.connect();
      client.release();

      await this.$connect();
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  /**
   * Centralized Lock Manager
   * Locks UserCollections first, then UserRequests and same goes for TeamCollections and then TeamRequests
   *
   * For UserCollection -> userUid, parentID (nullable)
   * For UserRequest -> collectionIDs
   * For TeamCollection -> parentID (nullable)
   * For TeamRequest -> collectionIDs
   */
  async acquireLocks(
    tx: Prisma.TransactionClient,
    table: 'UserCollection' | 'UserRequest' | 'TeamCollection' | 'TeamRequest',
    userUid: string,
    parentID: string | null,
    collectionIDs: string[] = [],
  ) {
    const schemaPrefix = this.schema ? `${this.schema}.` : '';

    if (table === 'UserCollection' && userUid) {
      const tableName = Prisma.raw(`${schemaPrefix}"UserCollection"`);
      const lockQuery = parentID
        ? Prisma.sql`SELECT "orderIndex" FROM ${tableName} WHERE "userUid" = ${userUid} AND "parentID" = ${parentID} FOR UPDATE`
        : Prisma.sql`SELECT "orderIndex" FROM ${tableName} WHERE "userUid" = ${userUid} AND "parentID" IS NULL FOR UPDATE`;
      return tx.$executeRaw(lockQuery);
    }

    if (table === 'UserRequest' && collectionIDs.length > 0) {
      collectionIDs = collectionIDs.filter(Boolean).sort();
      const tableName = Prisma.raw(`${schemaPrefix}"UserRequest"`);
      const lockQuery = Prisma.sql`SELECT "orderIndex" FROM ${tableName} WHERE "collectionID" IN (${Prisma.join(collectionIDs)}) FOR UPDATE`;
      return tx.$executeRaw(lockQuery);
    }

    if (table === 'TeamCollection') {
      const tableName = Prisma.raw(`${schemaPrefix}"TeamCollection"`);
      const lockQuery = parentID
        ? Prisma.sql`SELECT "orderIndex" FROM ${tableName} WHERE "parentID" = ${parentID} FOR UPDATE`
        : Prisma.sql`SELECT "orderIndex" FROM ${tableName} WHERE "parentID" IS NULL FOR UPDATE`;
      return tx.$executeRaw(lockQuery);
    }

    if (table === 'TeamRequest' && collectionIDs.length > 0) {
      collectionIDs = collectionIDs.filter(Boolean).sort();
      const tableName = Prisma.raw(`${schemaPrefix}"TeamRequest"`);
      const lockQuery = Prisma.sql`SELECT "orderIndex" FROM ${tableName} WHERE "collectionID" IN (${Prisma.join(collectionIDs)}) FOR UPDATE`;
      return tx.$executeRaw(lockQuery);
    }
  }

  /**
   * Table-level lock
   */
  async lockTableExclusive(
    tx: Prisma.TransactionClient,
    tableName:
      | 'UserCollection'
      | 'UserRequest'
      | 'TeamCollection'
      | 'TeamRequest',
  ) {
    // Use schema-qualified table names to support non-public schemas
    const schemaPrefix = this.schema ? `${this.schema}.` : '';
    const fullTableName = Prisma.raw(`${schemaPrefix}"${tableName}"`);
    return tx.$executeRaw(
      Prisma.sql`LOCK TABLE ${fullTableName} IN EXCLUSIVE MODE`,
    );
  }
}
