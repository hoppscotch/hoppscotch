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

  async deleteAllVariablesFromTeamEnvironment(id: string) {
    try {
      const result = await this.prisma.teamEnvironment.update({
        where: { id: id },
        data: {
          variables: [],
        },
      });

      const teamEnvironment = this.cast(result);

      this.pubsub.publish(
        `team_environment/${teamEnvironment.teamID}/updated`,
        teamEnvironment,
      );

      return E.right(teamEnvironment);
    } catch (error) {
      return E.left(TEAM_ENVIRONMENT_NOT_FOUND);
    }
  }

  async createDuplicateEnvironment(id: string) {
    try {
      const result = await this.prisma.teamEnvironment.findFirst({
        where: {
          id: id,
        },
        rejectOnNotFound: true,
      });

      const duplicatedTeamEnvironment = this.cast(result);

      this.pubsub.publish(
        `team_environment/${duplicatedTeamEnvironment.teamID}/created`,
        duplicatedTeamEnvironment,
      );

      return E.right(duplicatedTeamEnvironment);
    } catch (error) {
      return E.left(TEAM_ENVIRONMENT_NOT_FOUND);
    }
  }

  async fetchAllTeamEnvironments(teamID: string) {
    const result = await this.prisma.teamEnvironment.findMany({
      where: {
        teamID: teamID,
      },
    });
    const teamEnvironments = result.map((item) => {
      return this.cast(item);
    });

    return teamEnvironments;
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
