import { Injectable, Logger } from "@nestjs/common";
import Redis, { RedisOptions } from "ioredis";
import { CacheEventEmitter } from "./cache.emitter";
import { CachePubSubMessage } from "./cache.interface";
import { CACHE_MODULE, CACHE_PUBSUB_DELETE_CHANNEL_EVENT } from "./constants";
/**
 * pubsub service
 *
 * @export
 * @class CachePubSubService
 */
@Injectable()
export class CachePubSubService {
  private readonly logger = new Logger(CACHE_MODULE);

  private publisher!: Redis;

  private subscriber!: Redis;

  private instanceId: string = Date.now().toString();

  constructor(private readonly emitter: CacheEventEmitter) {}

  public async init(pubsubOptions: RedisOptions): Promise<this> {
    this.publisher = new Redis(pubsubOptions);
    this.subscriber = new Redis(pubsubOptions);

    await this.subscriber.subscribe(CACHE_PUBSUB_DELETE_CHANNEL_EVENT);

    this.subscriber.on("message", this.handleMessageEvent.bind(this));
    this.emitter.on("deleted", this.publishDeletedEvent.bind(this));
    this.logger.log(`[${this.instanceId}] PubSub initialized`);
    return this;
  }

  public async close(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
    this.logger.log(`[${this.instanceId}] PubSub quit`);
  }

  private async handleMessageEvent(channel: string, raw: string): Promise<void> {
    const message = JSON.parse(raw) as CachePubSubMessage;

    if (message.instanceId === this.instanceId) {
      return;
    }

    if (channel === CACHE_PUBSUB_DELETE_CHANNEL_EVENT) {
      this.emitter.emit("delete", message.data);
    }
  }

  private async publishDeletedEvent(keys: string[]): Promise<void> {
    await this.publisher.publish(
      CACHE_PUBSUB_DELETE_CHANNEL_EVENT,
      JSON.stringify({
        instanceId: this.instanceId,
        data: keys,
      }),
    );
  }
}
