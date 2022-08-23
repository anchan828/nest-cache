import { AsyncLocalStorage } from "async_hooks";
import Redis, { RedisOptions } from "ioredis";
export interface RedisStoreArgs extends RedisOptions {
  /**
   * The shared redis client
   *
   * @type {Redis}
   * @memberof RedisStoreArgs
   */
  client?: Redis;

  /**
   * The ttl in seconds.
   *
   * @type {number}
   * @memberof RedisStoreArgs
   */
  ttl?: number;

  /**
   * If you use AsyncLocalStorage, set up an instance of AsyncLocalStorage.
   *
   * @type {AsyncLocalStorage<any>}
   * @memberof RedisStoreArgs
   */
  asyncLocalStorage?: AsyncLocalStorage<any>;

  hooks?: {
    /**
     * Called when the redis cache is hit.
     */
    hit?: (key: string, field: string | undefined) => void | Promise<void>;

    /**
     * Called when a cache is saved to redis.
     */
    set?: (key: string, field: string | undefined, value: any, ttl: number | undefined) => void | Promise<void>;
    /**
     * Called when a cache is deleted from redis.
     */
    delete?: (key: string, field: string | undefined) => void | Promise<void>;
  };
}
