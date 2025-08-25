import { Injectable, Optional } from '@nestjs/common';
import {
  AdminUserInvitationMailDescription,
  MailDescription,
  UserMagicLinkMailDescription,
} from './MailDescriptions';
import { throwErr } from 'src/utils';
import { EMAIL_FAILED } from 'src/errors';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  constructor(
    @Optional() private readonly nestMailerService: NestMailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Takes an input mail description and spits out the Email subject required for it
   * @param mailDesc The mail description to get subject for
   * @returns The subject of the email
   */
  private resolveSubjectForMailDesc(
    mailDesc:
      | MailDescription
      | UserMagicLinkMailDescription
      | AdminUserInvitationMailDescription,
  ): string {
    switch (mailDesc.template) {
      case 'team-invitation':
        return `A user has invited you to join a team workspace in Hoppscotch`;

      case 'user-invitation':
        return 'Sign in to Hoppscotch';
    }
  }

  /**
   * Sends an email to the given email address given a mail description
   * @param to Receiver's email id
   * @param mailDesc Definition of what email to be sent
   * @returns Response if email was send successfully or not
   */
  async sendEmail(
    to: string,
    mailDesc: MailDescription | UserMagicLinkMailDescription,
  ) {
    if (this.configService.get('INFRA.MAILER_SMTP_ENABLE') !== 'true') return;

    try {
      await this.nestMailerService.sendMail({
        to,
        template: mailDesc.template,
        subject: this.resolveSubjectForMailDesc(mailDesc),
        context: mailDesc.variables,
      });
    } catch (error) {
      console.error('Error from sendEmail:', error);
      return throwErr(EMAIL_FAILED);
    }
  }

  /**
   *
   * @param to Receiver's email id
   * @param mailDesc Details of email to be sent for user invitation
   * @returns Response if email was send successfully or not
   */
  async sendUserInvitationEmail(
    to: string,
    mailDesc: AdminUserInvitationMailDescription,
  ) {
    if (this.configService.get('INFRA.MAILER_SMTP_ENABLE') !== 'true') return;

    try {
      const res = await this.nestMailerService.sendMail({
        to,
        template: mailDesc.template,
        subject: this.resolveSubjectForMailDesc(mailDesc),
        context: mailDesc.variables,
      });
      return res;
    } catch (error) {
      console.error('Error from sendUserInvitationEmail:', error);
      return throwErr(EMAIL_FAILED);
    }
  }
}
