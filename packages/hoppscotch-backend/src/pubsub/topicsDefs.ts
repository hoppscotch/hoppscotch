import { UserSettings } from 'src/user-settings/user-settings.model';
import { UserEnvironment } from '../user-environment/user-environments.model';

// A custom message type that defines the topic and the corresponding payload.
// For every module that publishes a subscription add its type def and the possible subscription type.
export type TopicDef = {
  [
    topic: `user_environment/${string}/${'created' | 'updated' | 'deleted'}`
  ]: UserEnvironment;
  [
    topic: `user_settings/${string}/${'created' | 'updated' | 'deleted'}`
  ]: UserSettings;
  [topic: `user_environment/${string}/deleted_many`]: number;
};
