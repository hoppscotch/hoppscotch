import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MockServerService } from './mock-server.service';
import * as E from 'fp-ts/Either';

@Controller('mock')
export class MockServerController {
  constructor(private readonly mockServerService: MockServerService) {}

  @Get(':subdomain/*')
  async handleGetRequest(
    @Param('subdomain') subdomain: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleMockRequest('GET', subdomain, req, res);
  }

  @Post(':subdomain/*')
  async handlePostRequest(
    @Param('subdomain') subdomain: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleMockRequest('POST', subdomain, req, res);
  }

  @Put(':subdomain/*')
  async handlePutRequest(
    @Param('subdomain') subdomain: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleMockRequest('PUT', subdomain, req, res);
  }

  @Delete(':subdomain/*')
  async handleDeleteRequest(
    @Param('subdomain') subdomain: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleMockRequest('DELETE', subdomain, req, res);
  }

  @Patch(':subdomain/*')
  async handlePatchRequest(
    @Param('subdomain') subdomain: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleMockRequest('PATCH', subdomain, req, res);
  }

  private async handleMockRequest(
    method: string,
    subdomain: string,
    req: Request,
    res: Response,
  ) {
    // Extract the path after the subdomain
    const fullPath = req.path;
    const subdomainPath = `/mock/${subdomain}`;
    const path = fullPath.substring(subdomainPath.length) || '/';

    try {
      const result = await this.mockServerService.handleMockRequest(
        subdomain,
        path,
        method,
      );

      if (E.isLeft(result)) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: 'Endpoint not found',
          message: result.left,
        });
      }

      const mockResponse = result.right;

      // Set response headers if any
      if (mockResponse.headers) {
        const headers = JSON.parse(mockResponse.headers);
        Object.keys(headers).forEach((key) => {
          res.setHeader(key, headers[key]);
        });
      }

      // Add delay if specified
      if (mockResponse.delay && mockResponse.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, mockResponse.delay));
      }

      // Send response
      return res.status(mockResponse.statusCode).send(mockResponse.body);
    } catch (error) {
      console.error('Error handling mock request:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'Failed to process mock request',
      });
    }
  }
}
