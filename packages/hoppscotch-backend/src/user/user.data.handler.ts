import * as T from 'fp-ts/Task';
import * as TO from 'fp-ts/TaskOption';
import { AuthUser } from '../types/AuthUser';

/**
 * Defines how external services should handle User Data and User data related operations and actions.
 */
export interface UserDataHandler {
  canAllowUserDeletion: (user: AuthUser) => TO.TaskOption<string>;
  onUserDelete: (user: AuthUser) => T.Task<void>;
}
