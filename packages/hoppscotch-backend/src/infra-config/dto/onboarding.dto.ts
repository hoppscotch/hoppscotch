import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { InfraConfigEnum } from 'src/types/InfraConfig';

export class GetOnboardingStatusResponse {
  @ApiProperty()
  @Expose()
  onboardingCompleted: boolean;
  @ApiProperty()
  @Expose()
  canReRunOnboarding: boolean;
}

export class SaveOnboardingConfigRequest {
  @ApiProperty()
  @IsString()
  [InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS]: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.GOOGLE_CLIENT_ID]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.GOOGLE_CLIENT_SECRET]: string;
  @ApiPropertyOptional()
  @IsOptional()
  [InfraConfigEnum.GOOGLE_CALLBACK_URL]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.GOOGLE_SCOPE]: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.GITHUB_CLIENT_ID]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.GITHUB_CLIENT_SECRET]: string;
  @ApiPropertyOptional()
  @IsOptional()
  [InfraConfigEnum.GITHUB_CALLBACK_URL]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.GITHUB_SCOPE]: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MICROSOFT_CLIENT_ID]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MICROSOFT_CLIENT_SECRET]: string;
  @ApiPropertyOptional()
  @IsOptional()
  [InfraConfigEnum.MICROSOFT_CALLBACK_URL]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MICROSOFT_SCOPE]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MICROSOFT_TENANT]: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_SMTP_ENABLE]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_USE_CUSTOM_CONFIGS]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_ADDRESS_FROM]: string;

  @ApiPropertyOptional()
  @IsOptional()
  [InfraConfigEnum.MAILER_SMTP_URL]: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_SMTP_HOST]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_SMTP_PORT]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_SMTP_SECURE]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_SMTP_USER]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_SMTP_PASSWORD]: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  [InfraConfigEnum.MAILER_TLS_REJECT_UNAUTHORIZED]: string;
}

export class SaveOnboardingConfigResponse {
  @ApiProperty()
  @Expose()
  token: string;
}

export class GetOnboardingConfigResponse {
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS]: string;

  @ApiProperty({ default: null })
  @Expose()
  [InfraConfigEnum.GOOGLE_CLIENT_ID]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.GOOGLE_CLIENT_SECRET]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.GOOGLE_CALLBACK_URL]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.GOOGLE_SCOPE]: string;

  @ApiProperty()
  @Expose()
  [InfraConfigEnum.GITHUB_CLIENT_ID]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.GITHUB_CLIENT_SECRET]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.GITHUB_CALLBACK_URL]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.GITHUB_SCOPE]: string;

  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MICROSOFT_CLIENT_ID]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MICROSOFT_CLIENT_SECRET]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MICROSOFT_CALLBACK_URL]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MICROSOFT_SCOPE]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MICROSOFT_TENANT]: string;

  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_SMTP_ENABLE]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_USE_CUSTOM_CONFIGS]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_ADDRESS_FROM]: string;

  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_SMTP_URL]: string;

  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_SMTP_HOST]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_SMTP_PORT]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_SMTP_SECURE]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_SMTP_USER]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_SMTP_PASSWORD]: string;
  @ApiProperty()
  @Expose()
  [InfraConfigEnum.MAILER_TLS_REJECT_UNAUTHORIZED]: string;
}
