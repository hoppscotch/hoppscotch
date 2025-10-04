import { registerEnumType } from '@nestjs/graphql';

export enum SortOptions {
  TITLE_ASC = 'TITLE_ASC',
  TITLE_DESC = 'TITLE_DESC',
}

registerEnumType(SortOptions, {
  name: 'SortOptions',
});
