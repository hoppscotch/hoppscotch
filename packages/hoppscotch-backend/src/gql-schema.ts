import { NestFactory } from '@nestjs/core';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { printSchema } from 'graphql/utilities';
import * as path from 'path';
import * as fs from 'fs';
import { ShortcodeResolver } from './shortcode/shortcode.resolver';
import { TeamCollectionResolver } from './team-collection/team-collection.resolver';
import { TeamEnvironmentsResolver } from './team-environments/team-environments.resolver';
import { TeamInvitationResolver } from './team-invitation/team-invitation.resolver';
import { TeamRequestResolver } from './team-request/team-request.resolver';
import { TeamMemberResolver } from './team/team-member.resolver';
import { TeamResolver } from './team/team.resolver';
import { UserCollectionResolver } from './user-collection/user-collection.resolver';
import { UserEnvironmentsResolver } from './user-environment/user-environments.resolver';
import { UserHistoryResolver } from './user-history/user-history.resolver';
import { UserRequestResolver } from './user-request/resolvers/user-request.resolver';
import { UserSettingsResolver } from './user-settings/user-settings.resolver';
import { UserResolver } from './user/user.resolver';
import { Logger } from '@nestjs/common';
import { AdminResolver } from './admin/admin.resolver';
import { TeamEnvsTeamResolver } from './team-environments/team.resolver';
import { TeamTeamInviteExtResolver } from './team-invitation/team-teaminvite-ext.resolver';
import { UserRequestUserCollectionResolver } from './user-request/resolvers/user-collection.resolver';
import { UserEnvsUserResolver } from './user-environment/user.resolver';
import { UserHistoryUserResolver } from './user-history/user.resolver';
import { UserSettingsUserResolver } from './user-settings/user.resolver';

/**
 * All the resolvers present in the application.
 *
 * NOTE: This needs to be KEPT UP-TO-DATE to keep the schema accurate
 */
const RESOLVERS = [
  AdminResolver,
  ShortcodeResolver,
  TeamResolver,
  TeamEnvsTeamResolver,
  TeamMemberResolver,
  TeamCollectionResolver,
  TeamTeamInviteExtResolver,
  TeamEnvironmentsResolver,
  TeamEnvsTeamResolver,
  TeamInvitationResolver,
  TeamRequestResolver,
  UserResolver,
  UserCollectionResolver,
  UserEnvironmentsResolver,
  UserEnvsUserResolver,
  UserHistoryUserResolver,
  UserHistoryResolver,
  UserCollectionResolver,
  UserRequestResolver,
  UserRequestUserCollectionResolver,
  UserSettingsResolver,
  UserSettingsUserResolver,
];

/**
 * All the custom scalars present in the application.
 *
 * NOTE: This needs to be KEPT UP-TO-DATE to keep the schema accurate
 */
const SCALARS = [];

/**
 * Generates the GraphQL Schema SDL definition and writes it into the location
 * specified by the `GQL_SCHEMA_EMIT_LOCATION` environment variable.
 */
export async function emitGQLSchemaFile() {
  const logger = new Logger('emitGQLSchemaFile');

  try {
    const destination = path.resolve(
      __dirname,
      process.env.GQL_SCHEMA_EMIT_LOCATION ?? '../gen/schema.gql',
    );

    logger.log(`GQL_SCHEMA_EMIT_LOCATION: ${destination}`);

    const app = await NestFactory.create(GraphQLSchemaBuilderModule);
    await app.init();

    const gqlSchemaFactory = app.get(GraphQLSchemaFactory);

    logger.log(
      `Generating Schema against ${RESOLVERS.length} resolvers and ${SCALARS.length} custom scalars`,
    );

    const schema = await gqlSchemaFactory.create(RESOLVERS, SCALARS, {
      numberScalarMode: 'integer',
    });

    const schemaString = printSchema(schema, {
      commentDescriptions: true,
    });

    logger.log(`Writing schema to GQL_SCHEMA_EMIT_LOCATION (${destination})`);

    // Generating folders if required to emit to the given output
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, schemaString);

    logger.log(`Wrote schema to GQL_SCHEMA_EMIT_LOCATION (${destination})`);
  } catch (e) {
    logger.error(
      `Failed writing schema to GQL_SCHEMA_EMIT_LOCATION. Reason: ${e}`,
    );
  }
}
