import { MailerService } from './mailer.service';
import { EMAIL_FAILED } from 'src/errors';


const mockNestMailerService = {
  sendMail: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};


describe('MailerService', () => {
  let service: MailerService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new MailerService(
      mockNestMailerService as any,
      mockConfigService as any,
    );
  });

  describe('sendEmail', () => {


    test('EP-S1 | Deve retornar undefined sem enviar e-mail quando SMTP está desligado (false)', async () => {
      // Arrange 
      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      // Act
      const result = await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    test('BVA-S1 | Deve retornar undefined sem enviar e-mail quando SMTP não está configurado (undefined)', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      // Act
      const result = await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    test('BVA-S2 | Deve retornar undefined sem enviar e-mail quando SMTP usa casing incorreto ("TRUE")', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('TRUE');
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      // Act
      const result = await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });


    test('EP-S2 | Deve formatar e enviar e-mail corretamente para template "team-invitation" e retornar undefined', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('sent');
      const mailDesc = {
        template: 'team-invitation',
        variables: { role: 'VIEWER' },
      } as any;

      // Act
      const result = await service.sendEmail('jim@dundermifflin.com', mailDesc);

      // Assert
      expect(mockNestMailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jim@dundermifflin.com',
        template: 'team-invitation',
        subject: 'A user has invited you to join a team workspace in Hoppscotch',
        context: { role: 'VIEWER' },
      });

      expect(result).toBeUndefined();
    });

    test('EP-S3 | Deve formatar e enviar e-mail corretamente para template "user-invitation" e retornar undefined', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('sent');
      const mailDesc = {
        template: 'user-invitation',
        variables: {},
      } as any;

      // Act
      const result = await service.sendEmail('pam@dundermifflin.com', mailDesc);

      // Assert
      expect(mockNestMailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'pam@dundermifflin.com',
        template: 'user-invitation',
        subject: 'Sign in to Hoppscotch',
        context: {},
      });
      expect(result).toBeUndefined();
    });

    test('EP-S4 | Deve registrar erro no console e retornar EMAIL_FAILED quando o transporte SMTP falha', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValue(new Error('SMTP timeout'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendEmail('michael@dundermifflin.com', mailDesc);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Error from sendEmail:', expect.any(Error));
      expect(result).toEqualLeft(EMAIL_FAILED);

      consoleSpy.mockRestore();
    });
  });


  describe('sendUserInvitationEmail', () => {


    test('EP-U1 | Deve retornar undefined sem enviar e-mail quando SMTP está desligado (false)', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendUserInvitationEmail(
        'dwight@dundermifflin.com',
        mailDesc,
      );

      // Assert
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    test('BVA-U1 | Deve retornar undefined sem enviar e-mail quando SMTP não está configurado (undefined)', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendUserInvitationEmail(
        'dwight@dundermifflin.com',
        mailDesc,
      );

      // Assert
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    test('BVA-U2 | Deve retornar undefined sem enviar e-mail quando SMTP usa casing incorreto ("TRUE")', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('TRUE');
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendUserInvitationEmail(
        'dwight@dundermifflin.com',
        mailDesc,
      );

      // Assert
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });


    test('EP-U2 | Deve formatar e enviar e-mail corretamente e PROPAGAR o retorno do transporte quando SMTP está ligado', async () => {
      // Arrange — partição válida;
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('email_sent_successfully');
      const mailDesc = {
        template: 'user-invitation',
        variables: { inviteId: '123' },
      } as any;

      // Act
      const result = await service.sendUserInvitationEmail(
        'jim@dundermifflin.com',
        mailDesc,
      );

      // Assert
      expect(mockNestMailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jim@dundermifflin.com',
        template: 'user-invitation',
        subject: 'Sign in to Hoppscotch',
        context: { inviteId: '123' },
      });
      
      expect(result).toBe('email_sent_successfully');
    });


    test('EP-U3 | Deve registrar erro no console e retornar EMAIL_FAILED quando o transporte SMTP falha', async () => {
      // Arrange 
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValue(new Error('Connection refused'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendUserInvitationEmail(
        'michael@dundermifflin.com',
        mailDesc,
      );

      // Assert 
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error from sendUserInvitationEmail:',
        expect.any(Error),
      );
      expect(result).toEqualLeft(EMAIL_FAILED);

      consoleSpy.mockRestore();
    });
  });
});