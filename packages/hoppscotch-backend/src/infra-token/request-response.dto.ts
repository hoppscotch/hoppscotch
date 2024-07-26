import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty } from 'class-validator';

// GET api/v1/infra/user-invitations
export class GetUserInvitationResponse {
  @ApiProperty()
  @Expose()
  inviteeEmail: string;

  @ApiProperty()
  @Expose()
  invitedOn: Date;
}

// DELETE api/v1/infra/user-invitations
export class DeleteUserInvitationRequest {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => String)
  @IsNotEmpty()
  @ApiProperty()
  inviteeEmails: string[];
}
export class DeleteUserInvitationResponse {
  @ApiProperty()
  @Expose()
  message: string;
}

// Used for Swagger doc only, in codebase throwHTTPErr function is used to throw errors
export class ExceptionResponse {
  @ApiProperty()
  @Expose()
  message: string;

  @ApiProperty()
  @Expose()
  statusCode: number;
}
