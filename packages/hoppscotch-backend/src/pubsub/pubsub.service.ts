import { OnModuleInit, Injectable } from '@nestjs/common';
import { createPubSub } from 'graphql-yoga';
import { TopicDef } from './topicsDefs';

type LocalPubSub = ReturnType<typeof createPubSub<Record<string, [unknown]>>>;

/*
 * In-memory PubSub (single instance, as the AIO image runs one backend).
 */

@Injectable()
export class PubSubService implements OnModuleInit {
  private pubsub: LocalPubSub;

  onModuleInit() {
    console.log('Initialize PubSub');

    this.pubsub = createPubSub<Record<string, [unknown]>>();
  }

  asyncIterator<T>(topic: string): AsyncIterator<T> {
    return this.pubsub.subscribe(topic) as AsyncIterator<T>;
  }

  async publish<T extends keyof TopicDef>(topic: T, payload: TopicDef[T]) {
    this.pubsub.publish(topic, payload);
  }
}
