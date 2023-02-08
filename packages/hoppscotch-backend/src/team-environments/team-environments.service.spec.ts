import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamEnvironment } from './team-environments.model';
import { TeamEnvironmentsService } from './team-environments.service';
import { TEAM_ENVIRONMENT_NOT_FOUND, TEAM_MEMBER_NOT_FOUND } from 'src/errors';

const mockPrisma = mockDeep<PrismaService>();

const mockPubSub = {
  publish: jest.fn().mockResolvedValue(null),
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const teamEnvironmentsService = new TeamEnvironmentsService(
  mockPrisma,
  mockPubSub as any,
);

const teamEnvironment = {
  id: '123',
  name: 'test',
  teamID: 'abc123',
  variables: [{}],
};

beforeEach(() => {
  mockReset(mockPrisma);
  mockPubSub.publish.mockClear();
});

describe('TeamEnvironmentsService', () => {
  describe('getTeamEnvironment', () => {
    test('queries the db with the id', async () => {
      mockPrisma.teamEnvironment.findFirst.mockResolvedValue(teamEnvironment);

      await teamEnvironmentsService.getTeamEnvironment('123')();

      expect(mockPrisma.teamEnvironment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: '123',
          },
        }),
      );
    });

    test('requests prisma to reject the query promise if not found', async () => {
      mockPrisma.teamEnvironment.findFirst.mockResolvedValue(teamEnvironment);

      await teamEnvironmentsService.getTeamEnvironment('123')();

      expect(mockPrisma.teamEnvironment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          rejectOnNotFound: true,
        }),
      );
    });

    test('should return a Some of the correct environment if exists', async () => {
      mockPrisma.teamEnvironment.findFirst.mockResolvedValue(teamEnvironment);

      const result = await teamEnvironmentsService.getTeamEnvironment('123')();

      expect(result).toEqualSome(teamEnvironment);
    });

    test('should return a None if the environment does not exist', async () => {
      mockPrisma.teamEnvironment.findFirst.mockRejectedValue('NotFoundError');

      const result = await teamEnvironmentsService.getTeamEnvironment('123')();

      expect(result).toBeNone();
    });
  });
  describe('createTeamEnvironment', () => {
    test('should create and return a new team environment given a valid name,variable and team ID', async () => {
      mockPrisma.teamEnvironment.create.mockResolvedValue(teamEnvironment);

      const result = await teamEnvironmentsService.createTeamEnvironment(
        teamEnvironment.name,
        teamEnvironment.teamID,
        JSON.stringify(teamEnvironment.variables),
      )();

      expect(result).toEqual(<TeamEnvironment>{
        id: teamEnvironment.id,
        name: teamEnvironment.name,
        teamID: teamEnvironment.teamID,
        variables: JSON.stringify(teamEnvironment.variables),
      });
    });

    test('should reject if given team ID is invalid', async () => {
      mockPrisma.teamEnvironment.create.mockRejectedValue(null as any);

      await expect(
        teamEnvironmentsService.createTeamEnvironment(
          teamEnvironment.name,
          'invalidteamid',
          JSON.stringify(teamEnvironment.variables),
        ),
      ).rejects.toBeDefined();
    });

    test('should reject if provided team environment name is not a string', async () => {
      mockPrisma.teamEnvironment.create.mockRejectedValue(null as any);

      await expect(
        teamEnvironmentsService.createTeamEnvironment(
          null as any,
          teamEnvironment.teamID,
          JSON.stringify(teamEnvironment.variables),
        ),
      ).rejects.toBeDefined();
    });

    test('should reject if provided variable is not a string', async () => {
      mockPrisma.teamEnvironment.create.mockRejectedValue(null as any);

      await expect(
        teamEnvironmentsService.createTeamEnvironment(
          teamEnvironment.name,
          teamEnvironment.teamID,
          null as any,
        ),
      ).rejects.toBeDefined();
    });

    test('should send pubsub message to "team_environment/<teamID>/created" if team environment is created successfully', async () => {
      mockPrisma.teamEnvironment.create.mockResolvedValueOnce(teamEnvironment);

      const result = await teamEnvironmentsService.createTeamEnvironment(
        teamEnvironment.name,
        teamEnvironment.teamID,
        JSON.stringify(teamEnvironment.variables),
      )();

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `team_environment/${teamEnvironment.teamID}/created`,
        result,
      );
    });
  });

  describe('deleteTeamEnvironment', () => {
    test('should resolve to true given a valid team environment ID', async () => {
      mockPrisma.teamEnvironment.delete.mockResolvedValueOnce(teamEnvironment);

      const result = await teamEnvironmentsService.deleteTeamEnvironment(
        teamEnvironment.id,
      )();

      expect(result).toEqualRight(true);
    });

    test('should throw TEAM_ENVIRONMMENT_NOT_FOUND if given id is invalid', async () => {
      mockPrisma.teamEnvironment.delete.mockRejectedValue('RecordNotFound');

      const result = await teamEnvironmentsService.deleteTeamEnvironment(
        'invalidid',
      )();

      expect(result).toEqualLeft(TEAM_ENVIRONMENT_NOT_FOUND);
    });

    test('should send pubsub message to "team_environment/<teamID>/deleted" if team environment is deleted successfully', async () => {
      mockPrisma.teamEnvironment.delete.mockResolvedValueOnce(teamEnvironment);

      const result = await teamEnvironmentsService.deleteTeamEnvironment(
        teamEnvironment.id,
      )();

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `team_environment/${teamEnvironment.teamID}/deleted`,
        {
          ...teamEnvironment,
          variables: JSON.stringify(teamEnvironment.variables),
        },
      );
    });
  });

  describe('updateVariablesInTeamEnvironment', () => {
    test('should add new variable to a team environment', async () => {
      mockPrisma.teamEnvironment.update.mockResolvedValueOnce({
        ...teamEnvironment,
        variables: [{ key: 'value' }],
      });

      const result = await teamEnvironmentsService.updateTeamEnvironment(
        teamEnvironment.id,
        teamEnvironment.name,
        JSON.stringify([{ key: 'value' }]),
      )();

      expect(result).toEqualRight(<TeamEnvironment>{
        ...teamEnvironment,
        variables: JSON.stringify([{ key: 'value' }]),
      });
    });

    test('should add new variable to already existing list of variables in a team environment', async () => {
      mockPrisma.teamEnvironment.update.mockResolvedValueOnce({
        ...teamEnvironment,
        variables: [{ key: 'value' }, { key_2: 'value_2' }],
      });

      const result = await teamEnvironmentsService.updateTeamEnvironment(
        teamEnvironment.id,
        teamEnvironment.name,
        JSON.stringify([{ key: 'value' }, { key_2: 'value_2' }]),
      )();

      expect(result).toEqualRight(<TeamEnvironment>{
        ...teamEnvironment,
        variables: JSON.stringify([{ key: 'value' }, { key_2: 'value_2' }]),
      });
    });

    test('should edit existing variables in a team environment', async () => {
      mockPrisma.teamEnvironment.update.mockResolvedValueOnce({
        ...teamEnvironment,
        variables: [{ key: '1234' }],
      });

      const result = await teamEnvironmentsService.updateTeamEnvironment(
        teamEnvironment.id,
        teamEnvironment.name,
        JSON.stringify([{ key: '1234' }]),
      )();

      expect(result).toEqualRight(<TeamEnvironment>{
        ...teamEnvironment,
        variables: JSON.stringify([{ key: '1234' }]),
      });
    });

    test('should delete existing variable in a team environment', async () => {
      mockPrisma.teamEnvironment.update.mockResolvedValueOnce(teamEnvironment);

      const result = await teamEnvironmentsService.updateTeamEnvironment(
        teamEnvironment.id,
        teamEnvironment.name,
        JSON.stringify([{}]),
      )();

      expect(result).toEqualRight(<TeamEnvironment>{
        ...teamEnvironment,
        variables: JSON.stringify([{}]),
      });
    });

    test('should edit name of an existing team environment', async () => {
      mockPrisma.teamEnvironment.update.mockResolvedValueOnce({
        ...teamEnvironment,
        variables: [{ key: '123' }],
      });

      const result = await teamEnvironmentsService.updateTeamEnvironment(
        teamEnvironment.id,
        teamEnvironment.name,
        JSON.stringify([{ key: '123' }]),
      )();

      expect(result).toEqualRight(<TeamEnvironment>{
        ...teamEnvironment,
        variables: JSON.stringify([{ key: '123' }]),
      });
    });

    test('should reject to TEAM_ENVIRONMMENT_NOT_FOUND if provided id is invalid', async () => {
      mockPrisma.teamEnvironment.update.mockRejectedValue('RecordNotFound');

      const result = await teamEnvironmentsService.updateTeamEnvironment(
        'invalidid',
        teamEnvironment.name,
        JSON.stringify(teamEnvironment.variables),
      )();

      expect(result).toEqualLeft(TEAM_ENVIRONMENT_NOT_FOUND);
    });

    test('should send pubsub message to "team_environment/<teamID>/updated" if team environment is updated successfully', async () => {
      mockPrisma.teamEnvironment.update.mockResolvedValueOnce(teamEnvironment);

      const result = await teamEnvironmentsService.updateTeamEnvironment(
        teamEnvironment.id,
        teamEnvironment.name,
        JSON.stringify([{ key: 'value' }]),
      )();

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `team_environment/${teamEnvironment.teamID}/updated`,
        {
          ...teamEnvironment,
          variables: JSON.stringify(teamEnvironment.variables),
        },
      );
    });
  });

  describe('deleteAllVariablesFromTeamEnvironment', () => {
    test('should delete all variables in a team environment', async () => {
      mockPrisma.teamEnvironment.update.mockResolvedValueOnce(teamEnvironment);

      const result =
        await teamEnvironmentsService.deleteAllVariablesFromTeamEnvironment(
          teamEnvironment.id,
        )();

      expect(result).toEqualRight(<TeamEnvironment>{
        ...teamEnvironment,
        variables: JSON.stringify([{}]),
      });
    });

    test('should reject to TEAM_ENVIRONMMENT_NOT_FOUND if provided id is invalid', async () => {
      mockPrisma.teamEnvironment.update.mockRejectedValue('RecordNotFound');

      const result =
        await teamEnvironmentsService.deleteAllVariablesFromTeamEnvironment(
          'invalidid',
        )();

      expect(result).toEqualLeft(TEAM_ENVIRONMENT_NOT_FOUND);
    });

    test('should send pubsub message to "team_environment/<teamID>/updated" if team environment is updated successfully', async () => {
      mockPrisma.teamEnvironment.update.mockResolvedValueOnce(teamEnvironment);

      const result =
        await teamEnvironmentsService.deleteAllVariablesFromTeamEnvironment(
          teamEnvironment.id,
        )();

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `team_environment/${teamEnvironment.teamID}/updated`,
        {
          ...teamEnvironment,
          variables: JSON.stringify([{}]),
        },
      );
    });
  });

  describe('createDuplicateEnvironment', () => {
    test('should duplicate an existing team environment', async () => {
      mockPrisma.teamEnvironment.findFirst.mockResolvedValueOnce(
        teamEnvironment,
      );

      mockPrisma.teamEnvironment.create.mockResolvedValueOnce({
        ...teamEnvironment,
        id: 'newid',
      });

      const result = await teamEnvironmentsService.createDuplicateEnvironment(
        teamEnvironment.id,
      )();

      expect(result).toEqualRight(<TeamEnvironment>{
        ...teamEnvironment,
        id: 'newid',
        variables: JSON.stringify(teamEnvironment.variables),
      });
    });

    test('should reject to TEAM_ENVIRONMMENT_NOT_FOUND if provided id is invalid', async () => {
      mockPrisma.teamEnvironment.findFirst.mockRejectedValue('NotFoundError');

      const result = await teamEnvironmentsService.createDuplicateEnvironment(
        teamEnvironment.id,
      )();

      expect(result).toEqualLeft(TEAM_ENVIRONMENT_NOT_FOUND);
    });

    test('should send pubsub message to "team_environment/<teamID>/created" if team environment is updated successfully', async () => {
      mockPrisma.teamEnvironment.findFirst.mockResolvedValueOnce(
        teamEnvironment,
      );

      mockPrisma.teamEnvironment.create.mockResolvedValueOnce({
        ...teamEnvironment,
        id: 'newid',
      });

      const result = await teamEnvironmentsService.createDuplicateEnvironment(
        teamEnvironment.id,
      )();

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `team_environment/${teamEnvironment.teamID}/created`,
        {
          ...teamEnvironment,
          id: 'newid',
          variables: JSON.stringify([{}]),
        },
      );
    });
  });
});
