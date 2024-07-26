import { Expose } from 'class-transformer';

export class GetUserInvitationResponse {
  @Expose()
  inviteeEmail: string;

  @Expose()
  invitedOn: Date;
}
