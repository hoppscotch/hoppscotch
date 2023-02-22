import { User } from 'src/user/user.model';
import { UserSettings } from 'src/user-settings/user-settings.model';
import { UserEnvironment } from '../user-environment/user-environments.model';
import { UserHistory } from '../user-history/user-history.model';
import { TeamMember } from 'src/team/team.model';
import { TeamEnvironment } from 'src/team-environments/team-environments.model';
import { TeamCollection } from 'src/team-collection/team-collection.model';
import { TeamRequest } from 'src/team-request/team-request.model';
import { TeamInvitation } from 'src/team-invitation/team-invitation.model';
import { Shortcode } from 'src/shortcode/shortcode.model';

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
  [topic: `team/${string}/${'member_added' | 'member_updated'}`]: TeamMember;
  [
    topic: `team_environment/${string}/${'created' | 'updated' | 'deleted'}`
  ]: TeamEnvironment;
  [
    topic: `team_coll/${string}/${
      | 'coll_added'
      | 'coll_updated'
      | 'coll_removed'}`
  ]: TeamCollection;
  [topic: `user_history/${string}/deleted_many`]: number;
  [topic: `team_req/${string}/${'req_created' | 'req_updated'}`]: TeamRequest;
  [topic: `team_req/${string}/req_deleted`]: string;
  [topic: `team/${string}/invite_added`]: TeamInvitation;
  [topic: `team/${string}/invite_removed`]: string;
  [topic: `shortcode/${string}/${'created' | 'revoked'}`]: Shortcode;
};
