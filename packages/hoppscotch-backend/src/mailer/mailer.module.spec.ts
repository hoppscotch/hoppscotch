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
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('register', () => {
    test('should return basic module immediately when GENERATE_GQL_SCHEMA is set', async () => {
      process.env.GENERATE_GQL_SCHEMA = 'true';

      const result = await MailerModule.register();

      expect(result).toEqual({ module: MailerModule });
      expect(mockLoadInfraConfiguration).not.toHaveBeenCalled();
    });

    test('should return basic module and log message when SMTP is disabled', async () => {
      delete process.env.GENERATE_GQL_SCHEMA;
      const mockEnv = { INFRA: { MAILER_SMTP_ENABLE: 'false' } };
      mockLoadInfraConfiguration.mockResolvedValue(mockEnv);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await MailerModule.register();

      expect(result).toEqual({ module: MailerModule });
      expect(consoleSpy).toHaveBeenCalledWith('Mailer module is disabled');
      expect(mockGetTransportOption).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    // Complemento: Teste de Caixa-Preta (Partição de Entrada Inválida/Não Mapeada)
    // Garante o contrato do objeto de saída independente da lógica interna
    test('should not include imports in the module object when SMTP config is invalid or missing', async () => {
      delete process.env.GENERATE_GQL_SCHEMA;
      const mockEnv = { INFRA: { MAILER_SMTP_ENABLE: 'random_string' } };
      mockLoadInfraConfiguration.mockResolvedValue(mockEnv);
      
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = (await MailerModule.register()) as any;

      expect(result.module).toBe(MailerModule);
      expect(result.imports).toBeUndefined();
    });

    test('should return configured module with NestMailerModule imports when SMTP is enabled', async () => {
      delete process.env.GENERATE_GQL_SCHEMA;
      const mockEnv = { INFRA: { MAILER_SMTP_ENABLE: 'true' } };
      mockLoadInfraConfiguration.mockResolvedValue(mockEnv);
      
      mockGetTransportOption.mockReturnValue({ host: 'smtp.dundermifflin.com', port: 587 });
      mockGetMailerAddressFrom.mockReturnValue('no-reply@dundermifflin.com');

      const result = (await MailerModule.register()) as any;

      expect(result.module).toBe(MailerModule);
      expect(result.imports).toBeDefined();
      expect(result.imports.length).toBe(1);
      
      expect(mockGetTransportOption).toHaveBeenCalledWith(mockEnv);
      expect(mockGetMailerAddressFrom).toHaveBeenCalledWith(mockEnv);
    });
  });
});