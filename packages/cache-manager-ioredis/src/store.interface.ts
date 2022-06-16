import { AsyncLocalStorage } from "async_hooks";
import { RedisOptions } from "ioredis";
export interface RedisStoreArgs extends RedisOptions {
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
    hit?: (key: string) => void | Promise<void>;

    /**
     * Called when a cache is saved to redis.
     */
    set?: (key: string, value: any, ttl?: number) => void | Promise<void>;
    /**
     * Called when a cache is deleted from redis.
     */
    delete?: (key: string) => void | Promise<void>;
  };
}

export type CallbackFunction = (err?: Error | null, result?: any | null) => void;
