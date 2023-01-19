import { Injectable } from '@nestjs/common';
import { PubSubService } from './pubsub/pubsub.service';
import { PrimitiveTypes } from './types/primitive-types';
import { CustomModuleTypes } from './types/custom-module-types';
import { SubscriptionType } from './types/subscription-types';

// Custom generic type to indicate the type of module
type ModuleType = PrimitiveTypes | CustomModuleTypes;

@Injectable()
export class SubscriptionHandler {
  constructor(private readonly pubsub: PubSubService) {}

  /**
   * Publishes a subscription using the pubsub module
   * @param topic a string containing the "module_name/identifier"
   * @param subscriptionType type of subscription being published
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
