import { ArgsType, Field, InputType } from '@nestjs/graphql';

@ArgsType()
@InputType()
export class PaginationArgs {
  @Field({
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
