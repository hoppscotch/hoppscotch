import * as T from "fp-ts/Task"
import * as TO from "fp-ts/TaskOption"
import { User } from "src/user/user.model"

/**
 * Defines how external services should handle User Data and User data related operations and actions.
 */
export interface UserDataHandler {
  canAllowUserDeletion: (user: User) => TO.TaskOption<string>
  onUserDelete: (user: User) => T.Task<void>
}