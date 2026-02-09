import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublishedDocsService } from './published-docs.service';
import * as E from 'fp-ts/Either';
import { throwHTTPErr } from 'src/utils';
import { PublishedDocs } from './published-docs.model';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';

@ApiTags('Published Docs')
@Controller({ version: '1', path: 'published-docs' })
@UseGuards(ThrottlerBehindProxyGuard)
export class PublishedDocsController {
  constructor(private readonly publishedDocsService: PublishedDocsService) {}

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get latest published documentation by slug',
    description:
      'Returns the latest version of published collection documentation by slug for unauthenticated users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved published documentation',
    type: () => PublishedDocs,
  })
  @ApiResponse({
    status: 404,
    description: 'Published documentation not found',
  })
  async getPublishedDocsBySlugLatest(@Param('slug') slug: string) {
    const result = await this.publishedDocsService.getPublishedDocBySlugPublic(
      slug,
      null,
    );

    if (E.isLeft(result)) {
      throwHTTPErr({ message: result.left, statusCode: HttpStatus.NOT_FOUND });
    }

    console.log(result.right);
    return result.right;
  }

  @Get(':slug/:version')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get published documentation by slug and version',
    description:
      'Returns published collection documentation by slug and version for unauthenticated users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved published documentation',
    type: () => PublishedDocs,
  })
  @ApiResponse({
    status: 404,
    description: 'Published documentation not found',
  })
  async getPublishedDocsBySlug(
    @Param('slug') slug: string,
    @Param('version') version: string,
  ) {
    const result = await this.publishedDocsService.getPublishedDocBySlugPublic(
      slug,
      version,
    );

    if (E.isLeft(result)) {
      throwHTTPErr({ message: result.left, statusCode: HttpStatus.NOT_FOUND });
    }

    console.log(result.right);
    return result.right;
  }
}
