import { Injectable, OnModuleInit } from '@nestjs/common';
import { InfraConfig } from './infra-config.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { InfraConfig as DBInfraConfig } from '@prisma/client';
import * as E from 'fp-ts/Either';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import {
  DATABASE_TABLE_NOT_EXIST,
  INFRA_CONFIG_NOT_FOUND,
  INFRA_CONFIG_NOT_LISTED,
  INFRA_CONFIG_RESET_FAILED,
  INFRA_CONFIG_UPDATE_FAILED,
} from 'src/errors';
import { throwErr } from 'src/utils';
import { ConfigService } from '@nestjs/config';
import { Status, stopApp } from './helper';
import { InfraConfigArgs } from './input-args';
import { AuthProvider } from 'src/auth/helper';

@Injectable()
export class InfraConfigService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeInfraConfigTable();
  }

  getDefaultInfraConfigs(): { name: InfraConfigEnum; value: string }[] {
    // Prepare rows for 'infra_config' table with default values (from .env) for each 'name'
    const infraConfigDefaultObjs: { name: InfraConfigEnum; value: string }[] = [
      {
        name: InfraConfigEnum.MAILER_SMTP_URL,
        value: process.env.MAILER_SMTP_URL,
      },
      {
        name: InfraConfigEnum.MAILER_ADDRESS_FROM,
        value: process.env.MAILER_ADDRESS_FROM,
      },
      {
        name: InfraConfigEnum.GOOGLE_CLIENT_ID,
        value: process.env.GOOGLE_CLIENT_ID,
      },
      {
        name: InfraConfigEnum.GOOGLE_CLIENT_SECRET,
        value: process.env.GOOGLE_CLIENT_SECRET,
      },
      {
        name: InfraConfigEnum.GITHUB_CLIENT_ID,
        value: process.env.GITHUB_CLIENT_ID,
      },
      {
        name: InfraConfigEnum.GITHUB_CLIENT_SECRET,
        value: process.env.GITHUB_CLIENT_SECRET,
      },
      {
        name: InfraConfigEnum.MICROSOFT_CLIENT_ID,
        value: process.env.MICROSOFT_CLIENT_ID,
      },
      {
        name: InfraConfigEnum.MICROSOFT_CLIENT_SECRET,
        value: process.env.MICROSOFT_CLIENT_SECRET,
      },
      {
        name: InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
        value: process.env.VITE_ALLOWED_AUTH_PROVIDERS,
      },
    ];

    return infraConfigDefaultObjs;
  }

  /**
   * Initialize the 'infra_config' table with values from .env
   * @description This function create rows 'infra_config' in very first time (only once)
   */
  async initializeInfraConfigTable() {
    try {
      // Get all the 'names' for 'infra_config' table
      const enumValues = Object.values(InfraConfigEnum);

      // Prepare rows for 'infra_config' table with default values for each 'name'
      const infraConfigDefaultObjs = this.getDefaultInfraConfigs();

      // Check if all the 'names' are listed in the default values
      if (enumValues.length !== infraConfigDefaultObjs.length) {
        throw new Error(INFRA_CONFIG_NOT_LISTED);
      }

      // Eliminate the rows (from 'infraConfigDefaultObjs') that are already present in the database table
      const dbInfraConfigs = await this.prisma.infraConfig.findMany();
      const propsToInsert = infraConfigDefaultObjs.filter(
        (p) => !dbInfraConfigs.find((e) => e.name === p.name),
      );

      if (propsToInsert.length > 0) {
        await this.prisma.infraConfig.createMany({ data: propsToInsert });
        stopApp();
      }
    } catch (error) {
      if (error.code === 'P2021') {
        // Prisma error code for 'Table does not exist'
        throwErr(DATABASE_TABLE_NOT_EXIST);
      } else {
        throwErr(error);
      }
    }
  }

  /**
   * Typecast a database InfraConfig to a InfraConfig model
   * @param dbInfraConfig database InfraConfig
   * @returns InfraConfig model
   */
  cast(dbInfraConfig: DBInfraConfig) {
    return <InfraConfig>{
      name: dbInfraConfig.name,
      value: dbInfraConfig.value,
    };
  }

  /**
   * Update InfraConfig by name
   * @param name Name of the InfraConfig
   * @param value Value of the InfraConfig
   * @returns InfraConfig model
   */
  async update(name: InfraConfigEnum, value: string) {
    try {
      const infraConfig = await this.prisma.infraConfig.update({
        where: { name },
        data: { value },
      });

      stopApp();

      return E.right(this.cast(infraConfig));
    } catch (e) {
      return E.left(INFRA_CONFIG_UPDATE_FAILED);
    }
  }

  /**
   * Update InfraConfigs by name
   * @param infraConfigs InfraConfigs to update
   * @returns InfraConfig model
   */
  async updateMany(infraConfigs: InfraConfigArgs[]) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const deleteCount = await tx.infraConfig.deleteMany({
          where: { name: { in: infraConfigs.map((p) => p.name) } },
        });

        const createCount = await tx.infraConfig.createMany({
          data: infraConfigs.map((p) => ({
            name: p.name,
            value: p.value,
          })),
        });

        if (deleteCount.count !== createCount.count) {
          throwErr(INFRA_CONFIG_UPDATE_FAILED);
        }
      });

      stopApp();

      return E.right(infraConfigs);
    } catch (e) {
      return E.left(INFRA_CONFIG_UPDATE_FAILED);
    }
  }

  /**
   * Enable or Disable SSO for login/signup
   * @param provider Auth Provider to enable or disable
   * @param status Status to enable or disable
   * @returns Either true or an error
   */
  async enableAndDisableSSO(provider: AuthProvider, status: Status) {
    const enabledAuthProviders = this.configService
      .get('INFRA.VITE_ALLOWED_AUTH_PROVIDERS')
      .split(',');
    const isProviderEnabled = enabledAuthProviders.includes(provider);

    let newEnabledAuthProviders = enabledAuthProviders;
    if (status === Status.ENABLE && !isProviderEnabled) {
      newEnabledAuthProviders = [...enabledAuthProviders, provider];
    } else if (status === Status.DISABLE && isProviderEnabled) {
      newEnabledAuthProviders = enabledAuthProviders.filter(
        (p) => p !== provider,
      );
    }

    const isUpdated = await this.update(
      InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
      newEnabledAuthProviders.join(','),
    );
    if (E.isLeft(isUpdated)) throwErr(isUpdated.left);

    return E.right(true);
  }

  /**
   * Get InfraConfig by name
   * @param name Name of the InfraConfig
   * @returns InfraConfig model
   */
  async get(name: InfraConfigEnum) {
    try {
      const infraConfig = await this.prisma.infraConfig.findUniqueOrThrow({
        where: { name },
      });

      return E.right(this.cast(infraConfig));
    } catch (e) {
      return E.left(INFRA_CONFIG_NOT_FOUND);
    }
  }

  /**
   * Get allowed auth providers for login/signup
   * @returns string[]
   */
  getAllowedAuthProviders() {
    return this.configService
      .get<string>('INFRA.VITE_ALLOWED_AUTH_PROVIDERS')
      .split(',');
  }

  /**
   * Reset all the InfraConfigs to their default values (from .env)
   */
  async reset() {
    try {
      const infraConfigDefaultObjs = this.getDefaultInfraConfigs();

      await this.prisma.infraConfig.deleteMany({
        where: { name: { in: infraConfigDefaultObjs.map((p) => p.name) } },
      });
      await this.prisma.infraConfig.createMany({
        data: infraConfigDefaultObjs,
      });

      stopApp();

      return E.right(true);
    } catch (e) {
      return E.left(INFRA_CONFIG_RESET_FAILED);
    }
  }
}
