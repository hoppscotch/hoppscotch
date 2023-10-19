import { ObjectType, OmitType } from '@nestjs/graphql';
import { User } from 'src/user/user.model';

@ObjectType()
export class Admin extends OmitType(User, [
  'isAdmin',
  'currentRESTSession',
  'currentGQLSession',
]) {}
