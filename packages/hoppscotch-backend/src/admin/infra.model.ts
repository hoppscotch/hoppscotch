import { Field, ObjectType } from '@nestjs/graphql';
import { Admin } from './admin.model';

@ObjectType()
export class Infra {
  @Field(() => Admin, {
    description: 'Admin who executed the action',
  })
  executedBy: Admin;
}
