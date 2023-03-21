import { Injectable } from '@nestjs/common';
import { pipe } from 'fp-ts/function';
import * as T from 'fp-ts/Task';
import * as TO from 'fp-ts/TaskOption';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { TeamEnvironment } from './team-environments.model';
import { TEAM_ENVIRONMENT_NOT_FOUND } from 'src/errors';

@Injectable()
export class TeamEnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  getTeamEnvironment(id: string) {
    return TO.tryCatch(() =>
      this.prisma.teamEnvironment.findFirst({
        where: { id },
        rejectOnNotFound: true,
      }),
    );
  }

  createTeamEnvironment(name: string, teamID: string, variables: string) {
    return pipe(
      () =>
        this.prisma.teamEnvironment.create({
          data: {
            name: name,
            teamID: teamID,
            variables: JSON.parse(variables),
          },
        }),
      T.chainFirst(
        (environment) => () =>
          this.pubsub.publish(
            `team_environment/${environment.teamID}/created`,
            <TeamEnvironment>{
              id: environment.id,
              name: environment.name,
              teamID: environment.teamID,
              variables: JSON.stringify(environment.variables),
            },
          ),
      ),
      T.map((data) => {
        return <TeamEnvironment>{
          id: data.id,
          name: data.name,
          teamID: data.teamID,
          variables: JSON.stringify(data.variables),
        };
      }),
    );
  }

  deleteTeamEnvironment(id: string) {
    return pipe(
      TE.tryCatch(
        () =>
          this.prisma.teamEnvironment.delete({
            where: {
              id: id,
            },
          }),
        () => TEAM_ENVIRONMENT_NOT_FOUND,
      ),
      TE.chainFirst((environment) =>
        TE.fromTask(() =>
          this.pubsub.publish(
            `team_environment/${environment.teamID}/deleted`,
            <TeamEnvironment>{
              id: environment.id,
              name: environment.name,
              teamID: environment.teamID,
              variables: JSON.stringify(environment.variables),
            },
          ),
        ),
      ),
      TE.map((data) => true),
    );
  }

  updateTeamEnvironment(id: string, name: string, variables: string) {
    return pipe(
      TE.tryCatch(
        () =>
          this.prisma.teamEnvironment.update({
            where: { id: id },
            data: {
              name,
              variables: JSON.parse(variables),
            },
          }),
        () => TEAM_ENVIRONMENT_NOT_FOUND,
      ),
      TE.chainFirst((environment) =>
        TE.fromTask(() =>
          this.pubsub.publish(
            `team_environment/${environment.teamID}/updated`,
            <TeamEnvironment>{
              id: environment.id,
              name: environment.name,
              teamID: environment.teamID,
              variables: JSON.stringify(environment.variables),
            },
          ),
        ),
      ),
      TE.map(
        (environment) =>
          <TeamEnvironment>{
            id: environment.id,
            name: environment.name,
            teamID: environment.teamID,
            variables: JSON.stringify(environment.variables),
          },
      ),
    );
  }

  deleteAllVariablesFromTeamEnvironment(id: string) {
    return pipe(
      TE.tryCatch(
        () =>
          this.prisma.teamEnvironment.update({
            where: { id: id },
            data: {
              variables: [],
            },
          }),
        () => TEAM_ENVIRONMENT_NOT_FOUND,
      ),
      TE.chainFirst((environment) =>
        TE.fromTask(() =>
          this.pubsub.publish(
            `team_environment/${environment.teamID}/updated`,
            <TeamEnvironment>{
              id: environment.id,
              name: environment.name,
              teamID: environment.teamID,
              variables: JSON.stringify(environment.variables),
            },
          ),
        ),
      ),
      TE.map(
        (environment) =>
          <TeamEnvironment>{
            id: environment.id,
            name: environment.name,
            teamID: environment.teamID,
            variables: JSON.stringify(environment.variables),
          },
      ),
    );
  }

  createDuplicateEnvironment(id: string) {
    return pipe(
      TE.tryCatch(
        () =>
          this.prisma.teamEnvironment.findFirst({
            where: {
              id: id,
            },
            rejectOnNotFound: true,
          }),
        () => TEAM_ENVIRONMENT_NOT_FOUND,
      ),
      TE.chain((environment) =>
        TE.fromTask(() =>
          this.prisma.teamEnvironment.create({
            data: {
              name: environment.name,
              teamID: environment.teamID,
              variables: environment.variables as Prisma.JsonArray,
            },
          }),
        ),
      ),
      TE.chainFirst((environment) =>
        TE.fromTask(() =>
          this.pubsub.publish(
            `team_environment/${environment.teamID}/created`,
            <TeamEnvironment>{
              id: environment.id,
              name: environment.name,
              teamID: environment.teamID,
              variables: JSON.stringify(environment.variables),
            },
          ),
        ),
      ),
      TE.map(
        (environment) =>
          <TeamEnvironment>{
            id: environment.id,
            name: environment.name,
            teamID: environment.teamID,
            variables: JSON.stringify(environment.variables),
          },
      ),
    );
  }

  fetchAllTeamEnvironments(teamID: string) {
    return pipe(
      () =>
        this.prisma.teamEnvironment.findMany({
          where: {
            teamID: teamID,
          },
        }),
      T.map(
        A.map(
          (environment) =>
            <TeamEnvironment>{
              id: environment.id,
              name: environment.name,
              teamID: environment.teamID,
              variables: JSON.stringify(environment.variables),
            },
        ),
      ),
    );
  }

  /**
   * Fetch the count of environments for a given team.
   * @param teamID team id
   * @returns a count of team envs
   */
  async totalEnvsInTeam(teamID: string) {
    const envCount = await this.prisma.teamEnvironment.count({
      where: {
        teamID: teamID,
      },
    });
    return envCount;
  }
}
