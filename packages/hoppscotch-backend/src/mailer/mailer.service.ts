import { Injectable } from '@nestjs/common';
import {
  AdminUserInvitationMailDescription,
  MailDescription,
  UserMagicLinkMailDescription,
} from './MailDescriptions';
import { throwErr } from 'src/utils';
import { EMAIL_FAILED } from 'src/errors';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  constructor(private readonly nestMailerService: NestMailerService) {}

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
        return `${mailDesc.variables.invitee} invited you to join ${mailDesc.variables.invite_team_name} in Hoppscotch`;

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
    try {
      await this.nestMailerService.sendMail({
        to,
        template: mailDesc.template,
        subject: this.resolveSubjectForMailDesc(mailDesc),
        context: mailDesc.variables,
      });
    } catch (error) {
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
    try {
      const res = await this.nestMailerService.sendMail({
        to,
        template: mailDesc.template,
        subject: this.resolveSubjectForMailDesc(mailDesc),
        context: mailDesc.variables,
      });
      return res;
    } catch (error) {
      return throwErr(EMAIL_FAILED);
    }
  }
}
