import { Injectable } from '@nestjs/common';
import { PubSubService } from './pubsub/pubsub.service';
import { PrimitiveTypes } from './types/primitive-types';
import { ModuleTypes } from './types/module-types';

// Custom generic type to indicate the type of module
type ModuleType = PrimitiveTypes | ModuleTypes;

// Contains constants for the subscription types we use in Subscription Handler
enum SubscriptionType {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
  DeleteMany = 'delete_many',
}

@Injectable()
export class SubscriptionHandler {
  constructor(private readonly pubsub: PubSubService) {}

  /**
   * Publishes a subscription using the pubsub module
   * @param topic a string containing the module name, an uid and the type of subscription
   * @param subscriptionType type of subscription being called
   * @param moduleType type of the module model being called
   * @returns a promise of type void
   */
  async publish(
    topic: string,
    subscriptionType: SubscriptionType,
    moduleType: ModuleType,
  ) {
    switch (subscriptionType) {
      case SubscriptionType.Created:
        await this.pubsub.publish(`${topic}/created`, moduleType);
        break;
      case SubscriptionType.Updated:
        await this.pubsub.publish(`${topic}/updated`, moduleType);
        break;
      case SubscriptionType.Deleted:
        await this.pubsub.publish(`${topic}/deleted`, moduleType);
        break;
      case SubscriptionType.DeleteMany:
        await this.pubsub.publish(`${topic}/delete_many`, moduleType);
        break;
      default:
        break;
    }
  }
}
