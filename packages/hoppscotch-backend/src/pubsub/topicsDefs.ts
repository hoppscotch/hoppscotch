import { User } from 'src/user/user.model';
import { UserSettings } from 'src/user-settings/user-settings.model';
import { UserEnvironment } from '../user-environment/user-environments.model';
import { UserHistory } from '../user-history/user-history.model';
import { TeamMember } from 'src/team/team.model';
import { TeamEnvironment } from 'src/team-environments/team-environments.model';

// A custom message type that defines the topic and the corresponding payload.
// For every module that publishes a subscription add its type def and the possible subscription type.
export type TopicDef = {
  [topic: `user/${string}/${'updated'}`]: User;
  [topic: `user_settings/${string}/${'created' | 'updated'}`]: UserSettings;
  [
    topic: `user_environment/${string}/${'created' | 'updated' | 'deleted'}`
  ]: UserEnvironment;
  [topic: `user_environment/${string}/deleted_many`]: number;
  [
    topic: `user_history/${string}/${'created' | 'updated' | 'deleted'}`
  ]: UserHistory;
  [topic: `team/${string}/member_removed`]: string;
  [topic: `team/${string}/member_added`]: TeamMember;
  [topic: `team/${string}/member_updated`]: TeamMember;
  [topic: `team_environment/${string}/created`]: TeamEnvironment;
  [topic: `team_environment/${string}/updated`]: TeamEnvironment;
  [topic: `team_environment/${string}/deleted`]: TeamEnvironment;
  [topic: `user_history/${string}/deleted_many`]: number;
};
