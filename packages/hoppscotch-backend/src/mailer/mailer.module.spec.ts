import { MailerModule } from './mailer.module';

const mockLoadInfraConfiguration = jest.fn();
const mockGetTransportOption = jest.fn();
const mockGetMailerAddressFrom = jest.fn();

jest.mock('src/infra-config/helper', () => ({
  loadInfraConfiguration: () => mockLoadInfraConfiguration(),
}));

jest.mock('./helper', () => ({
  getTransportOption: (env: any) => mockGetTransportOption(env),
  getMailerAddressFrom: (env: any) => mockGetMailerAddressFrom(env),
}));

describe('MailerModule', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('register', () => {
    test('should return basic module when GraphQL schema generation is enabled', async () => {
      process.env.GENERATE_GQL_SCHEMA = 'true';

      const result = await MailerModule.register();

      expect(result).toEqual({ module: MailerModule });
      expect(mockLoadInfraConfiguration).not.toHaveBeenCalled();
      expect(mockGetTransportOption).not.toHaveBeenCalled();
      expect(mockGetMailerAddressFrom).not.toHaveBeenCalled();
    });

    test('should return configured module when SMTP is enabled', async () => {
      delete process.env.GENERATE_GQL_SCHEMA;

      const mockEnv = {
        INFRA: {
          MAILER_SMTP_ENABLE: 'true',
        },
      };

      mockLoadInfraConfiguration.mockResolvedValue(mockEnv);
      mockGetTransportOption.mockReturnValue({
        host: 'smtp.dundermifflin.com',
        port: 587,
      });
      mockGetMailerAddressFrom.mockReturnValue('no-reply@dundermifflin.com');

      const result = (await MailerModule.register()) as any;

      expect(mockLoadInfraConfiguration).toHaveBeenCalledTimes(1);
      expect(mockGetTransportOption).toHaveBeenCalledWith(mockEnv);
      expect(mockGetMailerAddressFrom).toHaveBeenCalledWith(mockEnv);

      expect(result.module).toBe(MailerModule);
      expect(result.imports).toBeDefined();
      expect(result.imports).toHaveLength(1);
    });

    test('should return basic module and log message when SMTP is disabled', async () => {
      delete process.env.GENERATE_GQL_SCHEMA;

      const mockEnv = {
        INFRA: {
          MAILER_SMTP_ENABLE: 'false',
        },
      };

      mockLoadInfraConfiguration.mockResolvedValue(mockEnv);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await MailerModule.register();

      expect(result).toEqual({ module: MailerModule });
      expect(consoleSpy).toHaveBeenCalledWith('Mailer module is disabled');
      expect(mockGetTransportOption).not.toHaveBeenCalled();
      expect(mockGetMailerAddressFrom).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should return basic module when SMTP config is invalid', async () => {
      delete process.env.GENERATE_GQL_SCHEMA;

      const mockEnv = {
        INFRA: {
          MAILER_SMTP_ENABLE: 'random_string',
        },
      };

      mockLoadInfraConfiguration.mockResolvedValue(mockEnv);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await MailerModule.register();

      expect(result).toEqual({ module: MailerModule });
      expect(consoleSpy).toHaveBeenCalledWith('Mailer module is disabled');
      expect(mockGetTransportOption).not.toHaveBeenCalled();
      expect(mockGetMailerAddressFrom).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});