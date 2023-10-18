import { ObjectType, PartialType } from '@nestjs/graphql';
import { User } from 'src/user/user.model';

@ObjectType()
export class Admin extends PartialType(User) {}
