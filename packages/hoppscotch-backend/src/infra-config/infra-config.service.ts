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
} from 'src/errors';
import { throwErr } from 'src/utils';
import { ConfigService } from '@nestjs/config';
import { stopApp } from './helper';

@Injectable()
export class InfraConfigService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeInfraConfigTable();
  }

  getDefaultInfraConfigs(): InfraConfig[] {
    // Prepare rows for 'infra_config' table with default values for each 'name'
    const infraConfigDefaultObjs: InfraConfig[] = [
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
        name: InfraConfigEnum.SAML_ISSUER,
        value: process.env.SAML_ISSUER,
      },
      {
        name: InfraConfigEnum.SAML_AUDIENCE,
        value: process.env.SAML_AUDIENCE,
      },
      {
        name: InfraConfigEnum.SAML_CALLBACK_URL,
        value: process.env.SAML_CALLBACK_URL,
      },
      {
        name: InfraConfigEnum.SAML_CERT,
        value: process.env.SAML_CERT,
      },
      {
        name: InfraConfigEnum.SAML_ENTRY_POINT,
        value: process.env.SAML_ENTRY_POINT,
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
      return E.left(INFRA_CONFIG_NOT_FOUND);
    }
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
   * Reset all the InfraConfigs to their default values (from .env)
   */
  async reset() {
    const infraConfigDefaultObjs = this.getDefaultInfraConfigs();

    await this.prisma.infraConfig.deleteMany({
      where: { name: { in: infraConfigDefaultObjs.map((p) => p.name) } },
    });

    await this.prisma.infraConfig.createMany({ data: infraConfigDefaultObjs });

    stopApp();
  }
}
