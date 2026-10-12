import { ArgsType, Field, ID } from '@nestjs/graphql';
import { IsString, IsNotEmpty } from 'class-validator';

@ArgsType()
export class CreateTeamEnvironmentArgs {
  @Field({
    name: 'name',
    description: 'Name of the Team Environment',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => ID, {
    name: 'teamID',
    description: 'ID of the Team',
  })
  @IsString()
  @IsNotEmpty()
  teamID: string;

  @Field({
    name: 'variables',
    description: 'JSON string of the variables object',
  })
  @IsString()
  @IsNotEmpty()
  variables: string;
}

@ArgsType()
export class UpdateTeamEnvironmentArgs {
  @Field(() => ID, {
    name: 'id',
    description: 'ID of the Team Environment',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field({
    name: 'name',
    description: 'Name of the Team Environment',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field({
    name: 'variables',
    description: 'JSON string of the variables object',
  })
  @IsString()
  @IsNotEmpty()
  variables: string;
}
