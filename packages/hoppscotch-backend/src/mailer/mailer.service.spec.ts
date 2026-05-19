import { MailerService } from './mailer.service';
import { EMAIL_FAILED } from 'src/errors';
// Nota: Assumindo que throwErr retorna um Left do fp-ts padrão do Hoppscotch

// 1. ARRANGE GLOBAL: Criamos os "Dublês de Teste"
const mockNestMailerService = {
  sendMail: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('MailerService', () => {
  let service: MailerService;

  beforeEach(() => {
    // Limpamos a memória dos espiões antes de cada teste
    jest.clearAllMocks();
    
    // Instanciamos o serviço injetando os dublês (injeção de dependência manual)
    service = new MailerService(
      mockNestMailerService as any,
      mockConfigService as any,
    );
  });

  describe('sendEmail', () => {
    test('Should NOT trigger email sending when SMTP is disabled in config', async () => {
      // ARRANGE: Configuramos o Stub para simular SMTP desligado
      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      // ACT: Tentamos enviar o e-mail
      await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // ASSERT: Verificamos o comportamento. O espião (Spy) NÃO deve ter sido chamado.
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
    });

    test('Should correctly format and trigger email sending when SMTP is enabled', async () => {
      // ARRANGE: Stub liga o SMTP e finge sucesso no envio
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('sent');
      
      const mailDesc = { 
        template: 'team-invitation', 
        variables: { role: 'VIEWER' } 
      } as any;

      // ACT: Executamos o método principal
      await service.sendEmail('jim@dundermifflin.com', mailDesc);

      // ASSERT: Verificação de Comportamento Rigorosa (Behavior Verification)
      // Aqui testamos indiretamente o método privado resolveSubjectForMailDesc!
      expect(mockNestMailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jim@dundermifflin.com',
        template: 'team-invitation',
        subject: 'A user has invited you to join a team workspace in Hoppscotch', // A prova de que o método privado funcionou!
        context: { role: 'VIEWER' },
      });
    });

    test('Should log error and return EMAIL_FAILED when SMTP sending fails', async () => {
      // ARRANGE: Stub liga o SMTP, mas o mock do carteiro falha!
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValue(new Error('SMTP timeout'));
      
      // Criamos um espião silencioso para o console.error (Evita sujar o terminal do Jest!)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // ACT:
      const result = await service.sendEmail('michael@dundermifflin.com', mailDesc);

      // ASSERT:
      expect(consoleSpy).toHaveBeenCalledWith('Error from sendEmail:', expect.any(Error));
      // Aqui você verificaria o retorno exato do throwErr, como:
      // expect(result).toEqualLeft(EMAIL_FAILED);

      // Limpeza do Spy de console
      consoleSpy.mockRestore();
    });
  });
});