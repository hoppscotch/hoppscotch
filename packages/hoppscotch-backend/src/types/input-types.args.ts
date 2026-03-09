import { ArgsType, Field, ID, InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';

@ArgsType()
@InputType()
export class PaginationArgs {
  @Field(() => ID, {
    nullable: true,
    defaultValue: undefined,
    description: 'Cursor for pagination, ID of the last item in the list',
  })
  cursor: string;

  @Field({
    nullable: true,
    defaultValue: 10,
    description: 'Number of items to fetch',
  })
  take: number;
}

@ArgsType()
@InputType()
export class OffsetPaginationArgs {
  @IsOptional()
  @IsNotEmpty()
  @Type(() => Number)
  @ApiPropertyOptional()
  @Field({
    nullable: true,
    defaultValue: 0,
    description: 'Number of items to skip',
  })
  skip: number;

  @IsOptional()
  @IsNotEmpty()
  @Type(() => Number)
  @ApiPropertyOptional()
  @Field({
    nullable: true,
    defaultValue: 10,
    description: 'Number of items to fetch',
  })
  take: number;
}
