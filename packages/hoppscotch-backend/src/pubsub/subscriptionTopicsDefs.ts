import { UserEnvironment } from '../user-environment/user-environments.model';
import { PrimitiveTypes } from '../types/primitiveTypes';

// A custom message type that defines the topic and the corresponding payload.
// For every module that publishes a subscription add its type def and the possible subscription type.
export type MessageType = {
  [
    topic: `user_environment/${string}/${
      | 'created'
      | 'updated'
      | 'deleted'
      | 'deleted_many'}`
  ]: UserEnvironment | PrimitiveTypes; // Returning a number hence having a union with `PrimitiveTypes`.
};
