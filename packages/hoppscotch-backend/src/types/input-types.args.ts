import { ArgsType, Field, ID, InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

@ArgsType()
@InputType()
export class PaginationArgs {
  @Field(() => ID, {
    nullable: true,
    defaultValue: undefined,
    description: 'Cursor for pagination, ID of the last item in the list',
  })
  @IsString()
  @IsOptional()
  cursor: string;

  @Field({
    nullable: true,
    defaultValue: 10,
    description: 'Number of items to fetch',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  take: number;
}

@ArgsType()
@InputType()
export class OffsetPaginationArgs {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiPropertyOptional()
  @Field({
    nullable: true,
    defaultValue: 0,
    description: 'Number of items to skip',
  })
  skip: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiPropertyOptional()
  @Field({
    nullable: true,
    defaultValue: 10,
    description: 'Number of items to fetch',
  })
  take: number = 10;
}
