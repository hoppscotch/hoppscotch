import { Field, ID, ObjectType } from '@nestjs/graphql';
import { SortOptions } from 'src/types/SortOptions';

@ObjectType()
export class UserCollectionSortData {
  @Field(() => ID, {
    description: 'ID of the parent collection',
    nullable: true,
  })
  parentCollectionID: string;

  @Field(() => SortOptions, {
    description: 'Sorting option',
  })
  sortOption: SortOptions;
}
