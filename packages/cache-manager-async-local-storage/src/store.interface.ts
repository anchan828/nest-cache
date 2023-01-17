import { AsyncLocalStorage } from "async_hooks";
export interface AsyncLocalStorageStoreArgs {
  /**
   * The ttl in seconds.
   * In the AsyncLocalStorage package, ttl works only when set to 0. If set to 0, no caching is performed.
   * @type {number}
   * @memberof RedisStoreArgs
   */
  ttl?: number;

  /**
   * Set up an instance of AsyncLocalStorage.
   *
   * @type {AsyncLocalStorage<any>}
   * @memberof RedisStoreArgs
   */
  asyncLocalStorage: AsyncLocalStorage<Map<string, any>>;

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
