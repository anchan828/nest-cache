import {
  CacheManager,
  CacheManagerSetOptions,
  chunk,
  isNullOrUndefined,
  patchMoreCommands,
} from "@anchan828/nest-cache-common";
import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { CacheModuleOptions } from "./cache.interface";
import { CACHE_MODULE_OPTIONS } from "./constants";
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
    @Inject(CACHE_MODULE_OPTIONS)
    private readonly options: CacheModuleOptions,
  ) {
    patchMoreCommands(this.cacheManager);
  }

  /**
   * Get cache from store
   * @template T
   * @param {string} key
   * @returns {Promise<T>}
   * @memberof CacheService
   */
  public async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * Get caches
   *
   * @param {string[]} keys
   * @return {*}  {(Promise<(T | undefined)[]>)}
   * @memberof CacheService
   */
  public async mget<T>(keys: string[]): Promise<Record<string, T | undefined>> {
    if (keys.length === 0) {
      return {};
    }

    const result: Record<string, T | undefined> = {};

    const caches = await this.cacheManager.mget<T>(...keys);

    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = caches[i];
    }

    return result;
  }

  /**
   * Set caches
   *
   * @param {(Record<string, T | undefined>)} values kay-value pair
   * @return {*}  {Promise<void>}
   * @memberof CacheService
   */
  public async mset<T>(values: Record<string, T | undefined>, options?: CacheManagerSetOptions): Promise<void> {
    const keyOrValues: (string | T)[] = [];

    for (const [key, value] of Object.entries(values)) {
      if (!isNullOrUndefined(value)) {
        keyOrValues.push(key, value);
      }
    }

    if (keyOrValues.length === 0) {
      return;
    }

    for (const items of chunk(keyOrValues, 2000)) {
      await this.cacheManager.mset<T>(...items, options);
    }
  }

  /**
   * Set cache to store.
   *
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<void>}
   * @memberof CacheService
   */
  public async set(key: string, value: unknown, ttlOrOptions?: number | CacheManagerSetOptions): Promise<void> {
    const options: CacheManagerSetOptions =
      typeof ttlOrOptions === "number" ? { ttl: ttlOrOptions } : ttlOrOptions || {};

    await this.cacheManager.set(key, value, options);
  }

  /**
   * Delete cache from store
   * @param {string} keys
   * @returns {Promise<void>}
   * @memberof CacheService
   */
  public async delete(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    keys = Array.from(new Set(keys));

    await this.cacheManager.del(...keys);
  }

  public async hget<T>(key: string, field: string): Promise<T | undefined> {
    return this.cacheManager.hget(key, field);
  }

  public async hset<T>(key: string, field: string, value: T): Promise<void> {
    await this.cacheManager.hset(key, field, value);
  }

  public async hdel(key: string, ...fields: string[]): Promise<void> {
    await this.cacheManager.hdel(key, ...fields);
  }

  public async hgetall(key: string): Promise<Record<string, any>> {
    return this.cacheManager.hgetall(key);
  }

  public async hkeys(key: string): Promise<string[]> {
    return this.cacheManager.hkeys(key);
  }

  /**
   * Get keys
   *
   * @param {string} [pattern]
   * @returns {Promise<string[]>}
   * @memberof CacheService
   */
  public async getKeys(pattern?: string): Promise<string[]> {
    let keys: string[] = [];

    if (pattern !== undefined && this.isMemoryStore()) {
      keys = await this.cacheManager.keys();
      keys = keys.filter((key) => key);
      if (pattern) {
        const inMemoryPattern = pattern.replace(new RegExp(/\*/, "g"), ".*");
        keys = keys.filter((key) => key.match(`^${inMemoryPattern}`));
      }
    } else {
      keys = await this.cacheManager.keys(pattern);
    }

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

  private isMemoryStore(): boolean {
    return this.cacheManager?.store.name === "memory";
  }
}
