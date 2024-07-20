import { CacheManager, chunk, isNullOrUndefined, patchMoreCommands } from "@anchan828/nest-cache-common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { CacheOptions } from "./cache.interface";
import { CacheMiddlewareService, createCacheContext } from "./cache.middleware";
/**
 * Access to cache manager and dependency
 *
 * @export
 * @class CacheService
 */
@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: CacheManager,
    private readonly middlewareService: CacheMiddlewareService,
  ) {
    patchMoreCommands(this.cacheManager);
  }

  /**
   * Get cache ttl
   *
   * @param {string} key
   * @param {CacheOptions} [options] cache options
   * @return {*}  {(Promise<number | undefined>)}
   * @memberof CacheService
   */
  public async ttl(key: string, options?: CacheOptions): Promise<number | undefined> {
    const context = createCacheContext<"ttl">({ key }, options);
    await this.middlewareService.runMiddlewares("ttl", context);
    return this.cacheManager.ttl(context.key);
  }

  /**
   * Get cache from store
   * @template T
   * @param {string} key
   * @returns {Promise<T>}
   * @memberof CacheService
   */
  public async get<T>(key: string, options?: CacheOptions): Promise<T | undefined> {
    const context = createCacheContext<"get">({ key }, options);
    await this.middlewareService.runMiddlewares("get", context);
    return this.cacheManager.get<T>(context.key);
  }

  /**
   * Get caches
   *
   * @param {string[]} keys
   * @param {CacheOptions} [options] cache options
   * @return {*}  {(Promise<(T | undefined)[]>)}
   * @memberof CacheService
   */
  public async mget<T>(keys: string[], options?: CacheOptions): Promise<Record<string, T | undefined>> {
    const context = createCacheContext<"mget">({ keys: Array.from(new Set([...keys])) }, options);

    await this.middlewareService.runMiddlewares("mget", context);

    if (context.keys.length === 0) {
      return {};
    }

    const result: Record<string, T | undefined> = {};

    const caches = (await this.cacheManager.mget(...context.keys)) as T[];

    for (let i = 0; i < context.keys.length; i++) {
      result[context.keys[i]] = caches[i];
    }

    return result;
  }

  /**
   * Set caches
   *
   * @param {(Record<string, T | undefined>)} record kay-value pair
   * @param {number} [ttl] time to live
   * @param {CacheOptions} [options] cache options
   * @return {*}  {Promise<void>}
   * @memberof CacheService
   */
  public async mset<T>(record: Record<string, T | undefined>, ttl?: number, options?: CacheOptions): Promise<void> {
    const context = createCacheContext<"mset">({ record, ttl }, options);

    await this.middlewareService.runMiddlewares("mset", context);

    const keyAndValues: [string, T][] = [];

    for (const [key, value] of Object.entries(context.record)) {
      if (!isNullOrUndefined(value)) {
        keyAndValues.push([key, value]);
      }
    }

    if (keyAndValues.length === 0) {
      return;
    }

    for (const items of chunk(keyAndValues, 2000)) {
      await this.cacheManager.mset(items, context.ttl);
    }
  }

  /**
   * Set cache to store.
   *
   * @param {string} key
   * @param {unknown} value
   * @param {number} [ttl]
   * @param {CacheOptions} [options] cache options
   * @returns {Promise<void>}
   * @memberof CacheService
   */
  public async set(key: string, value: unknown, ttl?: number, options?: CacheOptions): Promise<void> {
    const context = createCacheContext<"set">({ key, value, ttl }, options);
    await this.middlewareService.runMiddlewares("set", context);
    if (isNullOrUndefined(context.value)) {
      return;
    }
    await this.cacheManager.set(context.key, context.value, context.ttl);
  }

  /**
   * Delete cache from store
   *
   * @param {string} key
   * @param {CacheOptions} [options] cache options
   * @return {*}  {Promise<void>}
   * @memberof CacheService
   */
  public async delete(key: string, options?: CacheOptions): Promise<void> {
    const context = createCacheContext<"delete">({ key }, options);
    await this.middlewareService.runMiddlewares("delete", context);
    await this.cacheManager.del(context.key);
  }

  /**
   * Delete cache from store
   *
   * @param {string[]} keys
   * @param {CacheOptions} [options] cache options
   * @return {*}  {Promise<void>}
   * @memberof CacheService
   */
  public async mdel(keys: string[], options?: CacheOptions): Promise<void> {
    const context = createCacheContext<"mdel">({ keys: Array.from(new Set([...keys])) }, options);
    await this.middlewareService.runMiddlewares("mdel", context);
    await this.cacheManager.mdel(...context.keys);
  }

  public async hget<T>(key: string, field: string, options?: CacheOptions): Promise<T | undefined> {
    const context = createCacheContext<"hget">({ key, field }, options);
    await this.middlewareService.runMiddlewares("hget", context);
    return this.cacheManager.hget(context.key, context.field);
  }

  public async hset<T>(key: string, field: string, value: T, options?: CacheOptions): Promise<void> {
    const context = createCacheContext<"hset">({ key, field, value }, options);
    await this.middlewareService.runMiddlewares("hset", context);
    await this.cacheManager.hset(context.key, context.field, context.value);
  }

  public async hdel(key: string, fields: string[], options?: CacheOptions): Promise<void> {
    const context = createCacheContext<"hdel">({ key, fields: Array.from(new Set([...fields])) }, options);
    await this.middlewareService.runMiddlewares("hdel", context);

    if (context.fields.length === 0) {
      return;
    }

    await this.cacheManager.hdel(context.key, ...context.fields);
  }

  public async hgetall(key: string, options?: CacheOptions): Promise<Record<string, any>> {
    const context = createCacheContext<"hgetall">({ key }, options);
    await this.middlewareService.runMiddlewares("hgetall", context);
    return this.cacheManager.hgetall(context.key);
  }

  public async hkeys(key: string, options?: CacheOptions): Promise<string[]> {
    const context = createCacheContext<"hkeys">({ key }, options);
    await this.middlewareService.runMiddlewares("hkeys", context);
    return this.cacheManager.hkeys(context.key);
  }

  /**
   * Get keys
   *
   * @param {string} [pattern]
   * @returns {Promise<string[]>}
   * @memberof CacheService
   */
  public async getKeys(pattern?: string): Promise<string[]> {
    const keys = await this.cacheManager.keys(pattern);
    return keys.filter((k) => k).sort();
  }

  /**
   * Get key/value pairs
   *
   * @param {string} [pattern]
   * @return {*}  {Promise<Record<string, any>>}
   * @memberof CacheService
   */
  public async getEntries<T>(pattern?: string): Promise<Array<{ key: string; value: T | undefined }>> {
    const entries = await this.mget<T>(await this.getKeys(pattern));
    return Object.entries(entries).map(([key, value]) => ({ key, value }));
  }
}
