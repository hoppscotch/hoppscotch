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
    test('Should NOT trigger email sending when SMTP is disabled in config', async () => {
      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'team-invitation', variables: {} } as any;

      await service.sendEmail('dwight@dundermifflin.com', mailDesc);

      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
    });

    test('Should correctly format and trigger email sending when SMTP is enabled', async () => {
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('sent');

      const mailDesc = {
        template: 'team-invitation',
        variables: { role: 'VIEWER' },
      } as any;

      await service.sendEmail('jim@dundermifflin.com', mailDesc);

      expect(mockNestMailerService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jim@dundermifflin.com',
        template: 'team-invitation',
        subject:
          'A user has invited you to join a team workspace in Hoppscotch',
        context: { role: 'VIEWER' },
      });
    });

    test('Should log error and return EMAIL_FAILED when SMTP sending fails', async () => {
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValue(
        new Error('SMTP timeout'),
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      const result = await service.sendEmail(
        'michael@dundermifflin.com',
        mailDesc,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error from sendEmail:',
        expect.any(Error),
      );
      expect(result).toEqualLeft(EMAIL_FAILED);

      consoleSpy.mockRestore();
    });
  });

  describe('sendUserInvitationEmail', () => {
    test('Should NOT trigger email sending when SMTP is disabled in config', async () => {

      mockConfigService.get.mockReturnValue('false');
      const mailDesc = { template: 'user-invitation', variables: {} } as any;


      const result = await service.sendUserInvitationEmail(
        'dwight@dundermifflin.com',
        mailDesc,
      );

      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    test('Should correctly format, trigger email sending and return result when SMTP is enabled', async () => {

      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValue('email_sent_successfully');

      const mailDesc = {
        template: 'user-invitation',
        variables: { inviteId: '123' },
      } as any;


      const result = await service.sendUserInvitationEmail(
        'jim@dundermifflin.com',
        mailDesc,
      );


      expect(mockNestMailerService.sendMail).toHaveBeenCalledTimes(1);

      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jim@dundermifflin.com',
        template: 'user-invitation',
        subject: 'Sign in to Hoppscotch', 
        context: { inviteId: '123' },
      });

      expect(result).toBe('email_sent_successfully');
    });

    test('Should log error and return EMAIL_FAILED when SMTP sending fails', async () => {

      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValue(
        new Error('Connection refused'),
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const mailDesc = { template: 'user-invitation', variables: {} } as any;

      const result = await service.sendUserInvitationEmail(
        'michael@dundermifflin.com',
        mailDesc,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error from sendUserInvitationEmail:',
        expect.any(Error),
      );
      expect(result).toEqualLeft(EMAIL_FAILED);

      consoleSpy.mockRestore();
    });
  });
});