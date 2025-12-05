import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublishedDocsService } from './published-docs.service';
import { GetPublishedDocsQueryDto } from './published-docs.dto';
import * as E from 'fp-ts/Either';
import { throwHTTPErr } from 'src/utils';
import { PublishedDocs } from './published-docs.model';

@ApiTags('Published Docs')
@Controller({ version: '1', path: 'published-docs' })
export class PublishedDocsController {
  constructor(private readonly publishedDocsService: PublishedDocsService) {}

  @Get(':docId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get published documentation',
    description:
      'Returns published collection documentation in API-doc JSON format for unauthenticated users',
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
  async getPublishedDocs(
    @Param('docId') docId: string,
    @Query() query: GetPublishedDocsQueryDto,
  ) {
    const result = await this.publishedDocsService.getPublishedDocByIDPublic(
      docId,
      query,
    );

    if (E.isLeft(result)) {
      throwHTTPErr({ message: result.left, statusCode: HttpStatus.NOT_FOUND });
    }

    return result.right;
  }
}
