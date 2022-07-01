/* eslint-disable prefer-rest-params */
import {
  CacheManager,
  CacheManagerSetOptions,
  chunk,
  isNullOrUndefined,
  parseJSON,
} from "@anchan828/nest-cache-common";
import { CacheStore, CacheStoreFactory, LiteralObject } from "@nestjs/common";
import Redis from "ioredis";
import { AsyncLocalStorageService } from "./async-local-storage.service";
import { CACHE_STORE_NAME } from "./constants";
import { CallbackDecorator, DelCallbackDecorator } from "./store.decorator";
import { RedisStoreArgs } from "./store.interface";

export class RedisStore implements CacheManager {
  private readonly redisCache: Redis;

  public readonly name: string = CACHE_STORE_NAME;

  private readonly asyncLocalStorage: AsyncLocalStorageService;

  constructor(private readonly args: RedisStoreArgs) {
    this.asyncLocalStorage = new AsyncLocalStorageService(args.asyncLocalStorage);
    this.redisCache = new Redis(args);
  }

  @CallbackDecorator()
  public async set<T = any>(key: string, value: T, options?: CacheManagerSetOptions): Promise<void> {
    if (value === undefined || value === null) {
      return;
    }

    let ttl: number | undefined;

    if (options && !isNullOrUndefined(options.ttl)) {
      ttl = options.ttl;
    } else if (!isNullOrUndefined(this.args.ttl)) {
      ttl = this.args.ttl;
    }

    if (!isNullOrUndefined(ttl) && ttl !== 0 && ttl !== -1) {
      this.redisCache.setex(key, ttl, JSON.stringify(value));
    } else if (ttl !== 0) {
      this.redisCache.set(key, JSON.stringify(value));
    }

    this.asyncLocalStorage.set(key, value);
    await this.args.hooks?.set?.(key, value, ttl);
  }

  @CallbackDecorator()
  public async get<T>(key: string): Promise<T | undefined> {
    if (typeof key !== "string") {
      return;
    }

    let result: T | null | undefined = this.asyncLocalStorage.get<T>(key);

    if (!isNullOrUndefined(result)) {
      return result;
    }

    const rawResult = await this.redisCache.get(key);

    if (isNullOrUndefined(rawResult)) {
      return;
    }

    result = parseJSON<T>(rawResult);

    this.asyncLocalStorage.set(key, result);
    await this.args.hooks?.hit?.(key);
    return result;
  }

  @DelCallbackDecorator()
  public async del(...keys: string[]): Promise<void> {
    for (const deleteKeys of chunk(keys, 2000)) {
      await this.redisCache.del(...deleteKeys);
      for (const key of deleteKeys) {
        this.asyncLocalStorage.delete(key);
        await this.args.hooks?.delete?.(key);
      }
    }
  }

  @CallbackDecorator()
  public async keys(pattern?: string): Promise<string[]> {
    const results: string[] = [];
    if (!pattern) {
      pattern = "*";
    }

    for await (const keys of this.redisCache.scanStream({ match: pattern, count: 100 })) {
      results.push(...keys);
    }

    return results.sort();
  }

  @DelCallbackDecorator()
  public async reset(): Promise<void> {
    this.asyncLocalStorage.clear();
    const keys = await this.keys();
    if (keys.length !== 0) {
      await this.del(...keys.map((key) => key.replace(new RegExp(`^${this.args.keyPrefix}`), "")));
    }
  }

  @CallbackDecorator()
  public async mget<T>(...keysOrOptions: string[]): Promise<Array<T | undefined>> {
    const keys = keysOrOptions.filter((x): x is string => typeof x === "string") as string[];

    const map = new Map<string, T | undefined>(keys.map((key) => [key, undefined]));

    for (const key of keys) {
      if (typeof key !== "string") {
        continue;
      }

      const result = this.asyncLocalStorage.get(key);
      if (!isNullOrUndefined(result)) {
        map.set(key, result);
      }
    }

    const notFoundKeys = [...map.keys()].filter((key) => map.get(key) === undefined);

    if (notFoundKeys.length !== 0) {
      const results: Array<string | undefined> = [];

      for (const keys of chunk(notFoundKeys, 2000)) {
        results.push(...((await this.redisCache.mget(...keys)) as Array<string | undefined>));
      }

      for (let index = 0; index < notFoundKeys.length; index++) {
        if (results[index] !== undefined && results[index] !== null) {
          const key = notFoundKeys[index];
          const value = parseJSON<T>(results[index]);
          map.set(key, value);

          await this.args.hooks?.hit?.(key);

          this.asyncLocalStorage.set(key, value);
        }
      }
    }
    return [...map.values()];
  }

  @CallbackDecorator()
  public async mset<T>(...keyOrValues: Array<string | T | CacheManagerSetOptions>): Promise<void> {
    let options: CacheManagerSetOptions | undefined;

    if (keyOrValues.length % 2 > 0 && this.isObject(keyOrValues[keyOrValues.length - 1])) {
      options = keyOrValues[keyOrValues.length - 1] as CacheManagerSetOptions;
    }

    for (let i = 0; i < keyOrValues.length; i += 2) {
      if (keyOrValues.length !== i + 1) {
        const key = keyOrValues[i] as string;
        const value = keyOrValues[i + 1];
        if (typeof key !== "string") {
          continue;
        }

        if (value === undefined || value === null) {
          continue;
        }

        let ttl: number | undefined;

        if (options && !isNullOrUndefined(options.ttl)) {
          ttl = options.ttl;
        } else if (!isNullOrUndefined(this.args.ttl)) {
          ttl = this.args.ttl;
        }

        if (ttl === 0) {
          continue;
        }

        const json = JSON.stringify(value);

        if (ttl !== undefined && ttl !== null && ttl !== -1) {
          this.redisCache.setex(key, ttl, json);
        } else {
          this.redisCache.set(key, json);
        }

        await this.args.hooks?.set?.(key, json, ttl);

        this.asyncLocalStorage.set(key, value);
      }
    }
  }

  public async close(): Promise<void> {
    await this.redisCache.quit();
    this.asyncLocalStorage.clear();
  }

  private isObject(value: any): value is Object {
    return value instanceof Object && value.constructor === Object;
  }
}

export const redisStore: CacheStoreFactory = {
  create: (args: LiteralObject): CacheStore => new RedisStore(args),
};
