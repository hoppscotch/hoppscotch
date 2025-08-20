import { Global, Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailerService } from './mailer.service';
import { loadInfraConfiguration } from 'src/infra-config/helper';
import { getMailerAddressFrom, getTransportOption } from './helper';

@Global()
@Module({
  imports: [],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {
  static async register() {
    if (process.env.GENERATE_GQL_SCHEMA) return { module: MailerModule };

    const env = await loadInfraConfiguration();

    // If mailer SMTP is DISABLED, return the module without any configuration (service, listener, etc.)
    if (env.INFRA.MAILER_SMTP_ENABLE !== 'true') {
      console.log('Mailer module is disabled');
      return {
        module: MailerModule,
      };
    }

    // If mailer is ENABLED, return the module with configuration (service, etc.)

    // Determine transport configuration based on custom config flag
    const transportOption = getTransportOption(env);
    // Get mailer address from environment or config
    const mailerAddressFrom = getMailerAddressFrom(env);

    return {
      module: MailerModule,
      imports: [
        NestMailerModule.forRoot({
          transport: transportOption,
          defaults: {
            from: mailerAddressFrom,
          },
          template: {
            dir: __dirname + '/templates',
            adapter: new HandlebarsAdapter(),
          },
        }),
      ],
    };
  }
}
