import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class GetUserInvitationResponse {
  @ApiProperty()
  @Expose()
  inviteeEmail: string;

  @ApiProperty()
  @Expose()
  invitedOn: Date;
}
