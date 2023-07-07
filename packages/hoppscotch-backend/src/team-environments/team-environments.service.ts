import { Injectable } from '@nestjs/common';
import { pipe } from 'fp-ts/function';
import * as T from 'fp-ts/Task';
import * as TO from 'fp-ts/TaskOption';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { Prisma, TeamEnvironment as DBTeamEnvironment } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { TeamEnvironment } from './team-environments.model';
import { TEAM_ENVIRONMENT_NOT_FOUND } from 'src/errors';
import * as E from 'fp-ts/Either';
@Injectable()
export class TeamEnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  /**
   * Typecast a database TeamEnvironment to a TeamEnvironment model
   * @param teamEnvironment database TeamEnvironment
   * @returns TeamEnvironment model
   */
  private cast(teamEnvironment: DBTeamEnvironment): TeamEnvironment {
    return <TeamEnvironment>{
      id: teamEnvironment.id,
      name: teamEnvironment.name,
      teamID: teamEnvironment.teamID,
      variables: JSON.stringify(teamEnvironment.variables),
    };
  }

  async getTeamEnvironment(id: string) {
    try {
      const teamEnvironment =
        await this.prisma.teamEnvironment.findFirstOrThrow({
          where: { id },
        });
      return E.right(teamEnvironment);
    } catch (error) {
      return E.left(TEAM_ENVIRONMENT_NOT_FOUND);
    }
  }

  async createTeamEnvironment(name: string, teamID: string, variables: string) {
    const result = await this.prisma.teamEnvironment.create({
      data: {
        name: name,
        teamID: teamID,
        variables: JSON.parse(variables),
      },
    });

    const createdTeamEnvironment = this.cast(result);

    this.pubsub.publish(
      `team_environment/${createdTeamEnvironment.teamID}/created`,
      createdTeamEnvironment,
    );

    return createdTeamEnvironment;
  }

  async deleteTeamEnvironment(id: string) {
    try {
      const result = await this.prisma.teamEnvironment.delete({
        where: {
          id: id,
        },
      });

      const deletedTeamEnvironment = this.cast(result);

      this.pubsub.publish(
        `team_environment/${deletedTeamEnvironment.teamID}/deleted`,
        deletedTeamEnvironment,
      );

      return E.right(true);
    } catch (error) {
      return E.left(TEAM_ENVIRONMENT_NOT_FOUND);
    }
  }

  async updateTeamEnvironment(id: string, name: string, variables: string) {
    try {
      const result = await this.prisma.teamEnvironment.update({
        where: { id: id },
        data: {
          name,
          variables: JSON.parse(variables),
        },
      });

      const updatedTeamEnvironment = this.cast(result);

      this.pubsub.publish(
        `team_environment/${updatedTeamEnvironment.teamID}/updated`,
        updatedTeamEnvironment,
      );

      return E.right(updatedTeamEnvironment);
    } catch (error) {
      return E.left(TEAM_ENVIRONMENT_NOT_FOUND);
    }
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
