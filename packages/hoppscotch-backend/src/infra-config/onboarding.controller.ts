import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { InfraConfigService } from './infra-config.service';
import { RESTError } from 'src/types/RESTError';
import { throwHTTPErr } from 'src/utils';
import * as E from 'fp-ts/Either';
import {
  GetOnboardingConfigResponse,
  GetOnboardingStatusResponse,
  SaveOnboardingConfigRequest,
  SaveOnboardingConfigResponse,
} from './dto/onboarding.dto';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

@Controller({ path: 'onboarding', version: '1' })
export class OnboardingController {
  constructor(private infraConfigService: InfraConfigService) {}

  @Get('status')
  @ApiOkResponse({
    description: 'Get onboarding status',
    type: GetOnboardingStatusResponse,
  })
  async getOnboardingStatus(): Promise<GetOnboardingStatusResponse> {
    const onboardingStatus =
      await this.infraConfigService.getOnboardingStatus();

    if (E.isLeft(onboardingStatus))
      throwHTTPErr(<RESTError>{
        message: onboardingStatus.left,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });

    return plainToInstance(
      GetOnboardingStatusResponse,
      {
        onboardingCompleted: onboardingStatus.right.onboardingCompleted,
        canReRunOnboarding: onboardingStatus.right.canReRunOnboarding,
      },
      {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      },
    );
  }

  @Post('config')
  @ApiCreatedResponse({
    description: 'Onboarding configuration updated successfully',
    type: SaveOnboardingConfigResponse,
  })
  async updateOnboardingConfig(@Body() dto: SaveOnboardingConfigRequest) {
    const updateConfigResult =
      await this.infraConfigService.updateOnboardingConfig(dto);

    if (E.isLeft(updateConfigResult))
      throwHTTPErr(<RESTError>{
        message: updateConfigResult.left,
        statusCode: HttpStatus.BAD_REQUEST,
      });

    return plainToInstance(
      SaveOnboardingConfigResponse,
      updateConfigResult.right,
      {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      },
    );
  }

  @Get('config')
  @ApiOkResponse({
    description: 'Get onboarding configuration',
    type: GetOnboardingConfigResponse,
  })
  async getOnboardingConfig(@Query('token') token: string) {
    const onboardingConfig =
      await this.infraConfigService.getOnboardingConfig(token);

    if (E.isLeft(onboardingConfig))
      throwHTTPErr(<RESTError>{
        message: onboardingConfig.left,
        statusCode: HttpStatus.BAD_REQUEST,
      });

    return plainToInstance(
      GetOnboardingConfigResponse,
      onboardingConfig.right,
      {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      },
    );
  }
}
