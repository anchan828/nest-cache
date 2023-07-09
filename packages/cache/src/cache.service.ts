import { CacheManager, chunk, isNullOrUndefined, patchMoreCommands } from "@anchan828/nest-cache-common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
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
  ) {
    patchMoreCommands(this.cacheManager);
  }

  /**
   * Get cache ttl
   *
   * @param {string} key
   * @return {*}  {(Promise<number | undefined>)}
   * @memberof CacheService
   */
  public async ttl(key: string): Promise<number | undefined> {
    return this.cacheManager.ttl(key);
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
  public async mget<T>(keys: string[]): Promise<Record<string, T | undefined>>;

  /**
   * Get caches
   *
   * @template T
   * @param {...string[]} keys
   * @return {*}  {(Promise<Record<string, T | undefined>>)}
   * @memberof CacheService
   */
  public async mget<T>(...keys: string[]): Promise<Record<string, T | undefined>>;

  /**
   * Get caches
   *
   * @template T
   * @param {(string[] | string | undefined)} keyOrKeys
   * @param {...string[]} keys
   * @return {*}  {(Promise<Record<string, T | undefined>>)}
   * @memberof CacheService
   */
  public async mget<T>(
    keyOrKeys: string[] | string | undefined,
    ...keys: string[]
  ): Promise<Record<string, T | undefined>> {
    let getKeys: string[] = Array.isArray(keyOrKeys) ? keyOrKeys : keyOrKeys ? [keyOrKeys] : [];

    getKeys = Array.from(new Set([...getKeys, ...keys]));

    if (getKeys.length === 0) {
      return {};
    }

    const result: Record<string, T | undefined> = {};

    const caches = (await this.cacheManager.mget(...getKeys)) as T[];

    for (let i = 0; i < getKeys.length; i++) {
      result[getKeys[i]] = caches[i];
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
  public async mset<T>(record: Record<string, T | undefined>, ttl?: number): Promise<void> {
    const keyAndValues: [string, T][] = [];

    for (const [key, value] of Object.entries(record)) {
      if (!isNullOrUndefined(value)) {
        keyAndValues.push([key, value]);
      }
    }

    if (keyAndValues.length === 0) {
      return;
    }

    for (const items of chunk(keyAndValues, 2000)) {
      await this.cacheManager.mset(items, ttl);
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
  public async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (isNullOrUndefined(value)) {
      return;
    }
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * Delete cache from store
   *
   * @param {string} key
   * @return {*}  {Promise<void>}
   * @memberof CacheService
   */
  public async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Delete cache from store
   *
   * @param {string[]} keys
   * @return {*}  {Promise<void>}
   * @memberof CacheService
   */
  public async mdel(keys: string[]): Promise<void>;

  /**
   * Delete cache from store
   *
   * @param {...string[]} keys
   * @return {*}  {Promise<void>}
   * @memberof CacheService
   */
  public async mdel(...keys: string[]): Promise<void>;

  /**
   * Delete cache from store
   *
   * @param {(string[] | string | undefined)} keyOrKeys
   * @param {...string[]} keys
   * @return {*}  {Promise<void>}
   * @memberof CacheService
   */
  public async mdel(keyOrKeys: string[] | string | undefined, ...keys: string[]): Promise<void> {
    let deleteKeys: string[] = Array.isArray(keyOrKeys) ? keyOrKeys : keyOrKeys ? [keyOrKeys] : [];

    deleteKeys = Array.from(new Set([...deleteKeys, ...keys]));

    if (deleteKeys.length === 0) {
      return;
    }

    await this.cacheManager.mdel(...deleteKeys);
  }

  public async hget<T>(key: string, field: string): Promise<T | undefined> {
    return this.cacheManager.hget(key, field);
  }

  public async hset<T>(key: string, field: string, value: T): Promise<void> {
    await this.cacheManager.hset(key, field, value);
  }

  public async hdel(key: string, fields: string[]): Promise<void>;

  public async hdel(key: string, ...fields: string[]): Promise<void>;

  public async hdel(key: string, fieldOrFields: string[] | string | undefined, ...fields: string[]): Promise<void> {
    let deleteFields: string[] = Array.isArray(fieldOrFields) ? fieldOrFields : fieldOrFields ? [fieldOrFields] : [];

    deleteFields = Array.from(new Set([...deleteFields, ...fields]));

    if (deleteFields.length === 0) {
      return;
    }

    await this.cacheManager.hdel(key, ...deleteFields);
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
