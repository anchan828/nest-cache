import {
  CacheManager,
  CacheManagerGetOptions,
  CacheManagerSetOptions,
  chunk,
  isNullOrUndefined,
} from "@anchan828/nest-cache-common";
import { CACHE_MANAGER, Inject, Injectable, Logger } from "@nestjs/common";
import { CacheEventEmitter } from "./cache.emitter";
import { CacheModuleOptions } from "./cache.interface";
import { CACHE_MODULE, CACHE_MODULE_OPTIONS } from "./constants";
/**
 * Access to cache manager and dependency
 *
 * @export
 * @class CacheService
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CACHE_MODULE);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: CacheManager,
    @Inject(CACHE_MODULE_OPTIONS)
    private readonly options: CacheModuleOptions,
    private readonly emitter: CacheEventEmitter,
  ) {
    emitter.on("delete", (keys) => this.deleteWithoutEvent(...keys));
  }

  /**
   * Get cache from store
   * @template T
   * @param {string} key
   * @returns {Promise<T>}
   * @memberof CacheService
   */
  public async get<T>(key: string, options?: CacheManagerGetOptions): Promise<T | undefined> {
    return this.cacheManager.get<T>(key, options);
  }

  /**
   * Get caches
   *
   * @param {string[]} keys
   * @return {*}  {(Promise<(T | undefined)[]>)}
   * @memberof CacheService
   */
  public async mget<T>(keys: string[], options?: CacheManagerGetOptions): Promise<Record<string, T | undefined>> {
    if (keys.length === 0) {
      return {};
    }

    const result: Record<string, T | undefined> = {};

    const caches = this.isMemoryStore()
      ? await this.cacheManager.mget<T>(...keys)
      : await this.cacheManager.mget<T>(...keys, options);

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
    if (isNullOrUndefined(value)) {
      this.logger.debug(`cache manager doesn't store 'value' because 'value' is undefined.`);
      return;
    }

    if (typeof key !== "string") {
      this.logger.debug(`cache manager doesn't store 'value' because 'key' is undefined.`);
      return;
    }

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

    this.emitter.emit("deleted", keys);
    await this.cacheManager.del(...keys);
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
    let keyPattern = pattern;
    if (keyPattern && this.options.cacheVersion) {
      keyPattern = `${this.options.cacheVersion}:${pattern}`;
    }

    if (keyPattern !== undefined && this.isMemoryStore()) {
      keys = await this.cacheManager.keys();
      keys = keys.filter((key) => key);
      if (keyPattern) {
        const inMemoryPattern = keyPattern.replace(new RegExp(/\*/, "g"), ".*");
        keys = keys.filter((key) => key.match(`^${inMemoryPattern}`));
      }
    } else {
      keys = await this.cacheManager.keys(keyPattern);
    }

    return keys
      .filter((k) => k)
      .sort()
      .map((k) => (this.options.cacheVersion ? k.replace(new RegExp(`^(${this.options.cacheVersion}?):`), "") : k));
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

  /**
   * This method is internal delete method for pubsub
   */
  private async deleteWithoutEvent(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await this.cacheManager.del(...keys);
    this.logger.debug(`Deleted: ${keys.join(", ")}`);
  }

  private isMemoryStore(): boolean {
    return this.cacheManager?.store.name === "memory";
  }
}
