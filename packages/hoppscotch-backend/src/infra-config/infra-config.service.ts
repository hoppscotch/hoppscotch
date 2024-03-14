import { Injectable, OnModuleInit } from '@nestjs/common';
import { InfraConfig } from './infra-config.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { InfraConfig as DBInfraConfig } from '@prisma/client';
import * as E from 'fp-ts/Either';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import {
  AUTH_PROVIDER_NOT_SPECIFIED,
  DATABASE_TABLE_NOT_EXIST,
  INFRA_CONFIG_INVALID_INPUT,
  INFRA_CONFIG_NOT_FOUND,
  INFRA_CONFIG_RESET_FAILED,
  INFRA_CONFIG_UPDATE_FAILED,
  INFRA_CONFIG_SERVICE_NOT_CONFIGURED,
  INFRA_CONFIG_OPERATION_NOT_ALLOWED,
} from 'src/errors';
import {
  throwErr,
  validateSMTPEmail,
  validateSMTPUrl,
  validateUrl,
} from 'src/utils';
import { ConfigService } from '@nestjs/config';
import { ServiceStatus, getDefaultInfraConfigs, stopApp } from './helper';
import { EnableAndDisableSSOArgs, InfraConfigArgs } from './input-args';
import { AuthProvider } from 'src/auth/helper';

@Injectable()
export class InfraConfigService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // Following fields are not updatable by `infraConfigs` Mutation. Use dedicated mutations for these fields instead.
  EXCLUDE_FROM_UPDATE_CONFIGS = [
    InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
    InfraConfigEnum.ALLOW_ANALYTICS_COLLECTION,
    InfraConfigEnum.ANALYTICS_USER_ID,
    InfraConfigEnum.IS_FIRST_TIME_INFRA_SETUP,
  ];
  // Following fields can not be fetched by `infraConfigs` Query. Use dedicated queries for these fields instead.
  EXCLUDE_FROM_FETCH_CONFIGS = [
    InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
    InfraConfigEnum.ANALYTICS_USER_ID,
    InfraConfigEnum.IS_FIRST_TIME_INFRA_SETUP,
  ];

  async onModuleInit() {
    await this.initializeInfraConfigTable();
  }

  /**
   * Initialize the 'infra_config' table with values from .env
   * @description This function create rows 'infra_config' in very first time (only once)
   */
  async initializeInfraConfigTable() {
    try {
      // Fetch the default values (value in .env) for configs to be saved in 'infra_config' table
      const infraConfigDefaultObjs = await getDefaultInfraConfigs();

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
      if (error.code === 'P1001') {
        // Prisma error code for 'Can't reach at database server'
        // We're not throwing error here because we want to allow the app to run 'pnpm install'
      } else if (error.code === 'P2021') {
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
      value: dbInfraConfig.value ?? '',
    };
  }

  /**
   * Get all the InfraConfigs as map
   * @returns InfraConfig map
   */
  async getInfraConfigsMap() {
    const infraConfigs = await this.prisma.infraConfig.findMany();
    const infraConfigMap: Record<string, string> = {};
    infraConfigs.forEach((config) => {
      infraConfigMap[config.name] = config.value;
    });
    return infraConfigMap;
  }

  /**
   * Update InfraConfig by name
   * @param name Name of the InfraConfig
   * @param value Value of the InfraConfig
   * @param restartEnabled If true, restart the app after updating the InfraConfig
   * @returns InfraConfig model
   */
  async update(name: InfraConfigEnum, value: string, restartEnabled = false) {
    const isValidate = this.validateEnvValues([{ name, value }]);
    if (E.isLeft(isValidate)) return E.left(isValidate.left);

    try {
      const infraConfig = await this.prisma.infraConfig.update({
        where: { name },
        data: { value },
      });

      if (restartEnabled) stopApp();

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
    for (let i = 0; i < infraConfigs.length; i++) {
      if (this.EXCLUDE_FROM_UPDATE_CONFIGS.includes(infraConfigs[i].name))
        return E.left(INFRA_CONFIG_OPERATION_NOT_ALLOWED);
    }

    const isValidate = this.validateEnvValues(infraConfigs);
    if (E.isLeft(isValidate)) return E.left(isValidate.left);

    try {
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < infraConfigs.length; i++) {
          await tx.infraConfig.update({
            where: { name: infraConfigs[i].name },
            data: { value: infraConfigs[i].value },
          });
        }
      });

      stopApp();

      return E.right(infraConfigs);
    } catch (e) {
      return E.left(INFRA_CONFIG_UPDATE_FAILED);
    }
  }

  /**
   * Check if the service is configured or not
   * @param service Service can be Auth Provider, Mailer, Audit Log etc.
   * @param configMap Map of all the infra configs
   * @returns Either true or false
   */
  isServiceConfigured(
    service: AuthProvider,
    configMap: Record<string, string>,
  ) {
    switch (service) {
      case AuthProvider.GOOGLE:
        return (
          configMap.GOOGLE_CLIENT_ID &&
          configMap.GOOGLE_CLIENT_SECRET &&
          configMap.GOOGLE_CALLBACK_URL &&
          configMap.GOOGLE_SCOPE
        );
      case AuthProvider.GITHUB:
        return (
          configMap.GITHUB_CLIENT_ID &&
          configMap.GITHUB_CLIENT_SECRET &&
          configMap.GITHUB_CALLBACK_URL &&
          configMap.GITHUB_SCOPE
        );
      case AuthProvider.MICROSOFT:
        return (
          configMap.MICROSOFT_CLIENT_ID &&
          configMap.MICROSOFT_CLIENT_SECRET &&
          configMap.MICROSOFT_CALLBACK_URL &&
          configMap.MICROSOFT_SCOPE &&
          configMap.MICROSOFT_TENANT
        );
      case AuthProvider.EMAIL:
        return configMap.MAILER_SMTP_URL && configMap.MAILER_ADDRESS_FROM;
      default:
        return false;
    }
  }

  /**
   * Enable or Disable Analytics Collection
   *
   * @param status Status to enable or disable
   * @returns Boolean of status of analytics collection
   */
  async toggleAnalyticsCollection(status: ServiceStatus) {
    const isUpdated = await this.update(
      InfraConfigEnum.ALLOW_ANALYTICS_COLLECTION,
      status === ServiceStatus.ENABLE ? 'true' : 'false',
    );

    if (E.isLeft(isUpdated)) return E.left(isUpdated.left);
    return E.right(isUpdated.right.value === 'true');
  }

  /**
   * Enable or Disable SSO for login/signup
   * @param provider Auth Provider to enable or disable
   * @param status Status to enable or disable
   * @returns Either true or an error
   */
  async enableAndDisableSSO(providerInfo: EnableAndDisableSSOArgs[]) {
    const allowedAuthProviders = this.configService
      .get<string>('INFRA.VITE_ALLOWED_AUTH_PROVIDERS')
      .split(',');

    let updatedAuthProviders = allowedAuthProviders;

    const infraConfigMap = await this.getInfraConfigsMap();

    providerInfo.forEach(({ provider, status }) => {
      if (status === ServiceStatus.ENABLE) {
        const isConfigured = this.isServiceConfigured(provider, infraConfigMap);
        if (!isConfigured) {
          throwErr(INFRA_CONFIG_SERVICE_NOT_CONFIGURED);
        }
        updatedAuthProviders.push(provider);
      } else if (status === ServiceStatus.DISABLE) {
        updatedAuthProviders = updatedAuthProviders.filter(
          (p) => p !== provider,
        );
      }
    });

    updatedAuthProviders = [...new Set(updatedAuthProviders)];

    if (updatedAuthProviders.length === 0) {
      return E.left(AUTH_PROVIDER_NOT_SPECIFIED);
    }

    const isUpdated = await this.update(
      InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
      updatedAuthProviders.join(','),
      true,
    );
    if (E.isLeft(isUpdated)) return E.left(isUpdated.left);

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
   * Get InfraConfigs by names
   * @param names Names of the InfraConfigs
   * @returns InfraConfig model
   */
  async getMany(names: InfraConfigEnum[], checkDisallowedKeys: boolean = true) {
    if (checkDisallowedKeys) {
      // Check if the names are allowed to fetch by client
      for (let i = 0; i < names.length; i++) {
        if (this.EXCLUDE_FROM_FETCH_CONFIGS.includes(names[i]))
          return E.left(INFRA_CONFIG_OPERATION_NOT_ALLOWED);
      }
    }

    try {
      const infraConfigs = await this.prisma.infraConfig.findMany({
        where: { name: { in: names } },
      });

      return E.right(infraConfigs.map((p) => this.cast(p)));
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
    // These are all the infra-configs that should not be reset
    const RESET_EXCLUSION_LIST = [
      InfraConfigEnum.IS_FIRST_TIME_INFRA_SETUP,
      InfraConfigEnum.ANALYTICS_USER_ID,
      InfraConfigEnum.ALLOW_ANALYTICS_COLLECTION,
    ];
    try {
      const infraConfigDefaultObjs = await getDefaultInfraConfigs();
      const updatedInfraConfigDefaultObjs = infraConfigDefaultObjs.filter(
        (p) => RESET_EXCLUSION_LIST.includes(p.name) === false,
      );

      await this.prisma.infraConfig.deleteMany({
        where: {
          name: {
            in: updatedInfraConfigDefaultObjs.map((p) => p.name),
          },
        },
      });

      await this.prisma.infraConfig.createMany({
        data: updatedInfraConfigDefaultObjs,
      });

      stopApp();

      return E.right(true);
    } catch (e) {
      return E.left(INFRA_CONFIG_RESET_FAILED);
    }
  }

  /**
   * Validate the values of the InfraConfigs
   */
  validateEnvValues(
    infraConfigs: {
      name: InfraConfigEnum;
      value: string;
    }[],
  ) {
    for (let i = 0; i < infraConfigs.length; i++) {
      switch (infraConfigs[i].name) {
        case InfraConfigEnum.MAILER_SMTP_URL:
          const isValidUrl = validateSMTPUrl(infraConfigs[i].value);
          if (!isValidUrl) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.MAILER_ADDRESS_FROM:
          const isValidEmail = validateSMTPEmail(infraConfigs[i].value);
          if (!isValidEmail) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.GOOGLE_CLIENT_ID:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.GOOGLE_CLIENT_SECRET:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.GOOGLE_CALLBACK_URL:
          if (!validateUrl(infraConfigs[i].value))
            return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.GOOGLE_SCOPE:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.GITHUB_CLIENT_ID:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.GITHUB_CLIENT_SECRET:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.GITHUB_CALLBACK_URL:
          if (!validateUrl(infraConfigs[i].value))
            return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.GITHUB_SCOPE:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.MICROSOFT_CLIENT_ID:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.MICROSOFT_CLIENT_SECRET:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.MICROSOFT_CALLBACK_URL:
          if (!validateUrl(infraConfigs[i].value))
            return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.MICROSOFT_SCOPE:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        case InfraConfigEnum.MICROSOFT_TENANT:
          if (!infraConfigs[i].value) return E.left(INFRA_CONFIG_INVALID_INPUT);
          break;
        default:
          break;
      }
    }

    return E.right(true);
  }
}
