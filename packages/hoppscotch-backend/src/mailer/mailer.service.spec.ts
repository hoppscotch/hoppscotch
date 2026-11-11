import { mockDeep, mockReset } from 'jest-mock-extended';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailerService } from './mailer.service';
import { EMAIL_FAILED } from 'src/errors';
import {
  AdminUserInvitationMailDescription,
  MailDescription,
  UserMagicLinkMailDescription,
} from './MailDescriptions';

const mockNestMailerService = mockDeep<NestMailerService>();
const mockConfigService = mockDeep<ConfigService>();

const mailerServiceWithNestMailer = new MailerService(
  mockNestMailerService,
  mockConfigService,
);

const mailerServiceWithoutNestMailer = new MailerService(
  undefined,
  mockConfigService,
);

beforeEach(() => {
  mockReset(mockNestMailerService);
  mockReset(mockConfigService);
});

describe('MailerService', () => {
  const teamInviteDesc: MailDescription = {
    template: 'team-invitation',
    variables: {
      invitee: 'test@example.com',
      invite_team_name: 'Test Team',
      action_url: 'https://example.com/invite',
    },
  };

  const userMagicLinkDesc: UserMagicLinkMailDescription = {
    template: 'user-invitation',
    variables: {
      inviteeEmail: 'test@example.com',
      magicLink: 'https://example.com/magic',
    },
  };

  const adminUserInviteDesc: AdminUserInvitationMailDescription = {
    template: 'user-invitation',
    variables: {
      inviteeEmail: 'test@example.com',
      magicLink: 'https://example.com/admin-invite',
    },
  };

  describe('sendEmail', () => {
    test('should return early when MAILER_SMTP_ENABLE is not true', async () => {
      mockConfigService.get.mockReturnValue('false');

      const res = await mailerServiceWithNestMailer.sendEmail(
        'test@example.com',
        teamInviteDesc,
      );

      expect(res).toBeUndefined();
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
    });

    test('should throw EMAIL_FAILED when MAILER_SMTP_ENABLE is true but NestMailerService is undefined', async () => {
      mockConfigService.get.mockReturnValue('true');

      await expect(
        mailerServiceWithoutNestMailer.sendEmail(
          'test@example.com',
          userMagicLinkDesc,
        ),
      ).rejects.toThrow(EMAIL_FAILED);
    });

    test('should send email with resolved subject for team-invitation template', async () => {
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValueOnce({} as any);

      await mailerServiceWithNestMailer.sendEmail(
        'test@example.com',
        teamInviteDesc,
      );

      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        template: 'team-invitation',
        subject:
          'A user has invited you to join a team workspace in Hoppscotch',
        context: teamInviteDesc.variables,
      });
    });

    test('should send email with resolved subject for user-invitation template', async () => {
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValueOnce({} as any);

      await mailerServiceWithNestMailer.sendEmail(
        'test@example.com',
        userMagicLinkDesc,
      );

      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        template: 'user-invitation',
        subject: 'Sign in to Hoppscotch',
        context: userMagicLinkDesc.variables,
      });
    });

    test('should throw EMAIL_FAILED when NestMailerService.sendMail throws an error', async () => {
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValueOnce(
        new Error('SMTP connection error'),
      );

      await expect(
        mailerServiceWithNestMailer.sendEmail(
          'test@example.com',
          userMagicLinkDesc,
        ),
      ).rejects.toThrow(EMAIL_FAILED);
    });
  });

  describe('sendUserInvitationEmail', () => {
    test('should return early when MAILER_SMTP_ENABLE is not true', async () => {
      mockConfigService.get.mockReturnValue('false');

      const res = await mailerServiceWithNestMailer.sendUserInvitationEmail(
        'test@example.com',
        adminUserInviteDesc,
      );

      expect(res).toBeUndefined();
      expect(mockNestMailerService.sendMail).not.toHaveBeenCalled();
    });

    test('should throw EMAIL_FAILED when MAILER_SMTP_ENABLE is true but NestMailerService is undefined', async () => {
      mockConfigService.get.mockReturnValue('true');

      await expect(
        mailerServiceWithoutNestMailer.sendUserInvitationEmail(
          'test@example.com',
          adminUserInviteDesc,
        ),
      ).rejects.toThrow(EMAIL_FAILED);
    });

    test('should send user invitation email successfully and return response', async () => {
      const mockResponse = { messageId: '12345' };
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockResolvedValueOnce(mockResponse as any);

      const res = await mailerServiceWithNestMailer.sendUserInvitationEmail(
        'test@example.com',
        adminUserInviteDesc,
      );

      expect(mockNestMailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        template: 'user-invitation',
        subject: 'Sign in to Hoppscotch',
        context: adminUserInviteDesc.variables,
      });
      expect(res).toEqual(mockResponse);
    });

    test('should throw EMAIL_FAILED when NestMailerService.sendMail throws an error', async () => {
      mockConfigService.get.mockReturnValue('true');
      mockNestMailerService.sendMail.mockRejectedValueOnce(
        new Error('SMTP transport failed'),
      );

      await expect(
        mailerServiceWithNestMailer.sendUserInvitationEmail(
          'test@example.com',
          adminUserInviteDesc,
        ),
      ).rejects.toThrow(EMAIL_FAILED);
    });
  });
});
