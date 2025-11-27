import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TreeLevel {
  FULL = 'full',
  FIRST_LEVEL = 'first_level',
}

export class GetPublishedDocsQueryDto {
  @ApiPropertyOptional({
    description: 'Specifies whether to return full tree or only first level',
    enum: TreeLevel,
    default: TreeLevel.FULL,
    required: false,
  })
  @IsOptional()
  @IsEnum(TreeLevel)
  tree?: TreeLevel = TreeLevel.FULL;
}
