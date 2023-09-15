import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_CONNECTION } from 'src/constants';

const dbProvider = {
  provide: PG_CONNECTION,
  useValue: new Pool({
    user: 'postgres',
    host: 'hoppscotch-db',
    database: 'hoppscotch',
    password: 'testpass',
    port: 5432,
  }),
};

@Global()
@Module({
    providers: [dbProvider],
    exports: [dbProvider],
})
export class DbModule {}