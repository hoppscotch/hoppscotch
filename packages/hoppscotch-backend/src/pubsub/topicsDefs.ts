import { User } from 'src/user/user.model';
import { UserEnvironment } from '../user-environment/user-environments.model';

// A custom message type that defines the topic and the corresponding payload.
// For every module that publishes a subscription add its type def and the possible subscription type.
export type TopicDef = {
  [
    topic: `user_environment/${string}/${'created' | 'updated' | 'deleted'}`
  ]: UserEnvironment;
  [topic: `user/${string}/${'updated'}`]: User;
  [topic: `user_environment/${string}/deleted_many`]: number;
};
