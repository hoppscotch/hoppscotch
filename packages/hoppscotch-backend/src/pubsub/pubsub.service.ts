import { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { default as Redis, RedisOptions } from 'ioredis';

import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PubSub as LocalPubSub } from 'graphql-subscriptions';
import { TopicDef } from './topicsDefs';

/**
 * RedisPubSub uses JSON parsing for back and forth conversion, which loses Date objects, hence this reviver brings them back
 * This function implementation should function like the JSON.parse reviver function
 * @param key The key being parsed
 * @param value The value being parsed
 * @returns The updated value for the key
 */
const dateReviver = (key: string, value: unknown) => {
  const isISO8601Z =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;

  if (typeof value === 'string' && isISO8601Z.test(value)) {
    const tempDateNumber = Date.parse(value);

    if (!isNaN(tempDateNumber)) {
      return new Date(tempDateNumber);
    }
  }

  return value;
};

/*
 * Figure out which PubSub to use (simple/local for dev and Redis for production)
 * and expose it
 */

@Injectable()
export class PubSubService implements OnModuleInit {
  private pubsub: RedisPubSub | LocalPubSub;

  onModuleInit() {
    if (process.env.PRODUCTION === 'false') {
      console.log('Initialize PubSub in development mode');

      this.pubsub = new LocalPubSub();
    } else {
      console.log('Initialize PubSub in production mode');
      console.log(
        `REDIS_IP: ${process.env.REDIS_IP}, REDIS_PORT: ${process.env.REDIS_PORT}`,
      );

      const redisOptions: RedisOptions = {
        port: parseInt(process.env.REDIS_PORT || '6379'),
        host: process.env.REDIS_IP,
        retryStrategy: (times: number) => {
          return Math.min(times * 50, 2000);
        },
      };

      this.pubsub = new RedisPubSub({
        publisher: new Redis(redisOptions),
        subscriber: new Redis(redisOptions),
        reviver: dateReviver,
      });
    }
  }

  asyncIterator<T>(
    topic: string | string[],
    options?: unknown,
  ): AsyncIterator<T> {
    return this.pubsub.asyncIterator(topic, options);
  }

  async publish<T extends keyof TopicDef>(topic: T, payload: TopicDef[T]) {
    await this.pubsub.publish(topic, payload);
  }
}
