import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: pg.Pool;

  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      transactionOptions: {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      },
    });

    this.pool = pool;
  }
  async onModuleInit() {
    await this.$connect();
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
