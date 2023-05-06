import { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PubSub as LocalPubSub } from 'graphql-subscriptions';
import { TopicDef } from './topicsDefs';

/*
 * Figure out which PubSub to use (simple/local for dev and Redis for production)
 * and expose it
 */

@Injectable()
export class PubSubService implements OnModuleInit {
  private pubsub: LocalPubSub;

  onModuleInit() {
    console.log('Initialize PubSub');

    this.pubsub = new LocalPubSub();
  }

  asyncIterator<T>(topic: string | string[]): AsyncIterator<T> {
    return this.pubsub.asyncIterator(topic);
  }

  async publish<T extends keyof TopicDef>(topic: T, payload: TopicDef[T]) {
    await this.pubsub.publish(topic, payload);
  }
}
