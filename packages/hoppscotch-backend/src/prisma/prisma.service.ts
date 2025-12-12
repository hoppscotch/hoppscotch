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

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const parsed = PrismaService.parseDatabaseUrl(databaseUrl);

    // Generic SSL configuration for all database environments
    // Supports: AWS Aurora, Docker, local PostgreSQL, managed databases
    const sslConfig = PrismaService.getSSLConfig(parsed.sslMode);

    const pool = new pg.Pool({
      connectionString: parsed.connectionString,
      max: parsed.connectionLimit ?? 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: parsed.connectTimeout ?? 10000,
      ssl: sslConfig,
    });

    const adapter = new PrismaPg(pool, {
      schema: parsed.schema,
    });

    super({
      adapter,
      transactionOptions: {
        maxWait: 5000,
        timeout: 10000,
      },
    });

    this.pool = pool;
  }

  /**
   * --- SSL Configuration ---
   * Generic SSL handling for various database environments
   * - Local/Docker: No SSL (sslmode=disable or no sslmode)
   * - AWS Aurora/RDS: SSL with relaxed validation (common for managed databases)
   * - Custom: Set sslmode=verify-full for strict certificate validation
   */
  private static getSSLConfig(
    sslMode?: string,
  ): false | { rejectUnauthorized: boolean } {
    if (!sslMode || sslMode === 'disable') {
      // Local PostgreSQL, Docker containers - no SSL
      return false;
    }

    if (sslMode === 'require' || sslMode === 'prefer' || sslMode === 'allow') {
      // AWS Aurora, managed databases - SSL with relaxed validation
      // This is a pragmatic approach for cloud databases where:
      // - Connection is encrypted (prevents eavesdropping)
      // - Network isolation (VPC/firewall) provides additional security
      // - Certificate validation issues are common with managed services
      return { rejectUnauthorized: false };
    }

    if (sslMode === 'verify-ca' || sslMode === 'verify-full') {
      // Strict certificate validation - requires proper CA certificates
      // Note: May require additional configuration for Prisma v7 + adapter-pg
      return { rejectUnauthorized: true };
    }

    // Default to no SSL for unknown modes
    return false;
  }

  /**
   * --- DATABASE_URL Parser ---
   * Accepts:
   *   ?schema=custom
   *   ?connection_limit=10
   *   ?connect_timeout=5000
   *   ?sslmode=disable|prefer|require|verify-ca|verify-full
   */
  private static parseDatabaseUrl(databaseUrl: string): {
    connectionString: string;
    schema: string;
    connectionLimit?: number;
    connectTimeout?: number;
    sslMode?: string;
  } {
    try {
      const url = new URL(databaseUrl);
      const schema = url.searchParams.get('schema') || 'public';
      const connectionLimit = parseIntSafe(
        url.searchParams.get('connection_limit'),
      );
      const connectTimeout = parseIntSafe(
        url.searchParams.get('connect_timeout'),
      );
      const sslMode = url.searchParams.get('sslmode');

      // Remove all custom parameters including sslmode
      // We handle SSL configuration programmatically via the ssl option
      url.searchParams.delete('schema');
      url.searchParams.delete('connection_limit');
      url.searchParams.delete('connect_timeout');
      url.searchParams.delete('sslmode');

      return {
        connectionString: url.toString(),
        schema,
        connectionLimit,
        connectTimeout,
        sslMode: sslMode || undefined,
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
    if (table === 'UserCollection' && userUid) {
      const lockQuery = parentID
        ? Prisma.sql`SELECT "orderIndex" FROM "UserCollection" WHERE "userUid" = ${userUid} AND "parentID" = ${parentID} FOR UPDATE`
        : Prisma.sql`SELECT "orderIndex" FROM "UserCollection" WHERE "userUid" = ${userUid} AND "parentID" IS NULL FOR UPDATE`;
      return tx.$executeRaw(lockQuery);
    }

    if (table === 'UserRequest' && collectionIDs.length > 0) {
      collectionIDs = collectionIDs.filter(Boolean).sort();
      const lockQuery = Prisma.sql`SELECT "orderIndex" FROM "UserRequest" WHERE "collectionID" IN (${Prisma.join(collectionIDs)}) FOR UPDATE`;
      return tx.$executeRaw(lockQuery);
    }

    if (table === 'TeamCollection') {
      const lockQuery = parentID
        ? Prisma.sql`SELECT "orderIndex" FROM "TeamCollection" WHERE "parentID" = ${parentID} FOR UPDATE`
        : Prisma.sql`SELECT "orderIndex" FROM "TeamCollection" WHERE "parentID" IS NULL FOR UPDATE`;
      return tx.$executeRaw(lockQuery);
    }

    if (table === 'TeamRequest' && collectionIDs.length > 0) {
      collectionIDs = collectionIDs.filter(Boolean).sort();
      const lockQuery = Prisma.sql`SELECT "orderIndex" FROM "TeamRequest" WHERE "collectionID" IN (${Prisma.join(collectionIDs)}) FOR UPDATE`;
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
    return tx.$executeRaw(
      Prisma.sql`LOCK TABLE ${Prisma.raw(`"${tableName}"`)} IN EXCLUSIVE MODE`,
    );
  }
}
