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

    test('[BLACK BOX | EP] Should return undefined without sending email when SMTP is disabled (false)', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      // Act
      const result = await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(result).toBeUndefined();
    });

    test('[BLACK BOX | BVA] Should return undefined without sending email when SMTP is not configured (undefined)', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      // Act
      const result = await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(result).toBeUndefined();
    });

    test('[BLACK BOX | BVA] Should return undefined without sending email when SMTP uses incorrect casing ("TRUE")', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('TRUE');
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      // Act
      const result = await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(result).toBeUndefined();
    });

    test('[BLACK BOX | EP] Should succeed validating the sending flow for "team-invitation" template', async () => {
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
      expect(result).toBeUndefined(); // Para 'sendEmail', o sucesso silencioso é o output esperado
    });

    test('[BLACK BOX | EP] Should return EMAIL_FAILED monad when sending fails', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValue(new Error('SMTP timeout'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendEmail('michael@dundermifflin.com', mailDesc);

      // Assert
      expect(result).toEqualLeft(EMAIL_FAILED);
    });

    test('[WHITE BOX | Internal Path] Should not invoke NestMailerService dependency if SMTP early-return occurs', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      // Act
      await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // Assert 
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
    });

    test('[WHITE BOX | Integration/Spy] Should build and pass the exact payload (including template resolved in Switch) to NestMailerService', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('sent');
      const mailDesc = {
        template: 'team-invitation',
        variables: { role: 'VIEWER' },
      } as any;

      // Act
      await service.sendEmail('jim@dundermifflin.com', mailDesc);

      // Assert 
      expect(mockNestMailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jim@dundermifflin.com',
        template: 'team-invitation',
        subject: 'A user has invited you to join a team workspace in Hoppscotch',
        context: { role: 'VIEWER' },
      });
    });

    test('[WHITE BOX | Side Effect] Should trigger console.error logging the internal error stack in the catch block', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      const fakeError = new Error('SMTP timeout');
      mockNestMailerService.sendMail.mockRejectedValue(fakeError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      await service.sendEmail('michael@dundermifflin.com', mailDesc);

      // Assert 
      expect(consoleSpy).toHaveBeenCalledWith('Error from sendEmail:', fakeError);
      
      consoleSpy.mockRestore();
    });

    test('[WHITE BOX | Hidden Conditional Branch] Should leave subject as "undefined" if template is not mapped in the "resolveSubjectForMailDesc" switch', async () => {
      // Arrange 
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('sent');
      const mailDesc = {
        template: 'unknown-template-type', 
        variables: {},
      } as any;

      // Act
      await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: undefined }) // Sem branch tratada, o retorno da função é natural do JS (undefined)
      );
    });

  });

  describe('sendUserInvitationEmail', () => {

    test('[BLACK BOX | EP] Should return undefined without sending email when SMTP is disabled (false)', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendUserInvitationEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(result).toBeUndefined();
    });

    test('[BLACK BOX | BVA] Should return undefined without sending email when SMTP is not configured (undefined)', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendUserInvitationEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(result).toBeUndefined();
    });

    test('[BLACK BOX | EP] Should propagate the raw email transport response when sending is successful', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('email_sent_successfully');
      const mailDesc = {
        template: 'user-invitation',
        variables: { inviteId: '123' },
      } as any;

      // Act
      const result = await service.sendUserInvitationEmail('jim@dundermifflin.com', mailDesc);

      // Assert
      expect(result).toBe('email_sent_successfully'); // Diferente de sendEmail, aqui o negócio exige propagar o Output
    });

    test('[BLACK BOX | EP] Should return EMAIL_FAILED monad when sending fails', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValue(new Error('Connection refused'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      const result = await service.sendUserInvitationEmail('michael@dundermifflin.com', mailDesc);

      // Assert
      expect(result).toEqualLeft(EMAIL_FAILED);
    });


    test('[WHITE BOX | Internal Path] Should not invoke NestMailerService dependency if SMTP early-return occurs', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      await service.sendUserInvitationEmail('dwight@dundermifflin.com', mailDesc);

      // Assert
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
    });

    test('[WHITE BOX | Integration/Spy] Should build and pass the exact payload to NestMailerService in the Invitation flow', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('sent');
      const mailDesc = {
        template: 'user-invitation',
        variables: { inviteId: '123' },
      } as any;

      // Act
      await service.sendUserInvitationEmail('jim@dundermifflin.com', mailDesc);

      // Assert
      expect(mockNestMailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jim@dundermifflin.com',
        template: 'user-invitation',
        subject: 'Sign in to Hoppscotch',
        context: { inviteId: '123' },
      });
    });

    test('[WHITE BOX | Side Effect] Should trigger console.error logging the internal error stack in the catch block', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('true');
      const fakeError = new Error('Connection refused');
      mockNestMailerService.sendMail.mockRejectedValue(fakeError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      // Act
      await service.sendUserInvitationEmail('michael@dundermifflin.com', mailDesc);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Error from sendUserInvitationEmail:', fakeError);
      
      consoleSpy.mockRestore();
    });

  });
});