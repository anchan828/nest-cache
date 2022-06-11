import { RedisOptions } from "ioredis";
export interface RedisStoreArgs extends RedisOptions {
  /**
   * The ttl in seconds.
   *
   * @type {number}
   * @memberof RedisStoreArgs
   */
  ttl?: number;

  inMemory?: {
    enabled?: boolean;
    ttl?: number;
    pruneInterval?: number;
    max?: number;

    hooks?: {
      /**
       * Called when the in-memory cache is hit.
       */
      hit?: (key: string) => void | Promise<void>;
      /**
       * Called when a cache is saved to the in-memory.
       */
      set?: (key: string, value: any, ttl?: number) => void | Promise<void>;
      /**
       * Called when a cache is deleted from the in-memory.
       */
      delete?: (key: string) => void | Promise<void>;
    };
  };

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
