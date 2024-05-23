import { resolve } from 'path';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  createInstance,
  IHttpConfig,
  IHttpProxyConfig,
  IHttpRequest,
  IHttpResponse,
  getHttpOperationsFromSpec,
} from '@stoplight/prism-http';
import { IPrism, createLogger } from '@stoplight/prism-core';
import { IHttpOperation, HttpMethod } from '@stoplight/types';

@Injectable()
export class MockService implements OnModuleInit, OnModuleDestroy {
  private prism: IPrism<
    IHttpOperation,
    IHttpRequest,
    IHttpResponse,
    IHttpProxyConfig
  >;
  private logger = createLogger('MockService');
  private appLogger = new Logger('abc');

  onModuleInit() {
    const config: IHttpConfig = {
      mock: { dynamic: true },
      checkSecurity: false,
      validateRequest: true,
      validateResponse: true,
      errors: false,
      upstreamProxy: undefined,
      isProxy: false,
    };
    this.prism = createInstance(config, { logger: this.logger });
    console.log('mock init', this.prism);
  }

  async getResponse(request: Request, response: Response): Promise<any> {
    const oasSpec = resolve(__dirname, 'fixtures', 'petstore.yaml');
    const operations = await getHttpOperationsFromSpec(oasSpec);
    const myrequest = this.mapRequestToHttpRequest(request);
    const prismResponse = await pipe(
      this.prism.request(myrequest, operations),
      TE.fold(
        (error) => {
          this.appLogger.error('mock error:', error);
          return TE.left(error);
        },
        (result) => {
          this.appLogger.log('mock match:', result);
          return TE.right(result);
        },
      ),
    )();
    if (E.isRight(prismResponse)) {
      const httpResponse: IHttpResponse = prismResponse.right.output;
      response
        .status(httpResponse.statusCode)
        .set(httpResponse.headers)
        .send(httpResponse.body);
    } else {
      response.status(404).send({ error: prismResponse.left });
    }
  }

  private mapRequestToHttpRequest(request: Request): IHttpRequest {
    const mockPath = '/mock';
    let urlPath = request.url.startsWith(mockPath)
      ? request.url.slice(mockPath.length)
      : request.url;

    if (!urlPath) {
      urlPath = '/';
    }
    return {
      url: {
        // path: request.url,
        path: urlPath,
      },
      method: request.method.toLowerCase() as HttpMethod,
      body: request.body,
    };
  }

  async onModuleDestroy() {
    console.log('mock de-init');
  }
}
