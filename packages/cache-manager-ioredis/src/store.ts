/* eslint-disable prefer-rest-params */
import { CacheManager, CacheManagerSetOptions, chunk, isNullOrUndefined } from "@anchan828/nest-cache-common";
import { CacheStore, CacheStoreFactory, LiteralObject } from "@nestjs/common";
import Redis from "ioredis";
import { pack, unpack } from "msgpackr";
import { AsyncLocalStorageService } from "./async-local-storage.service";
import { CACHE_STORE_NAME } from "./constants";
import { RedisStoreArgs } from "./store.interface";
export class RedisStore implements CacheManager {
  private readonly client: Redis;

  public readonly name: string = CACHE_STORE_NAME;

  private readonly asyncLocalStorage: AsyncLocalStorageService;

  constructor(private readonly args: RedisStoreArgs) {
    this.asyncLocalStorage = new AsyncLocalStorageService(args.asyncLocalStorage);
    this.client = args.client ?? new Redis(args);
  }

  public async set<T = any>(key: string, value: T, options?: CacheManagerSetOptions): Promise<void> {
    if (isNullOrUndefined(value)) {
      return;
    }

    let ttl: number | undefined;

    if (options && !isNullOrUndefined(options.ttl)) {
      ttl = options.ttl;
    } else if (!isNullOrUndefined(this.args.ttl)) {
      ttl = this.args.ttl;
    }

    if (!isNullOrUndefined(ttl) && ttl !== 0 && ttl !== -1) {
      this.client.setex(key, ttl, pack(value));
    } else if (ttl !== 0) {
      this.client.set(key, pack(value));
    } else {
      return;
    }
    this.asyncLocalStorage.set(key, value);

    await this.args.hooks?.set?.(key, undefined, value, ttl);
  }

  public async get<T>(key: string): Promise<T | undefined> {
    if (typeof key !== "string") {
      return;
    }

    let result: T | null | undefined = this.asyncLocalStorage.get<T>(key);

    if (!isNullOrUndefined(result)) {
      return result;
    }

    const rawResult = await this.client.getBuffer(key);

    if (isNullOrUndefined(rawResult)) {
      return;
    }

    result = unpack(rawResult) as T;

    this.asyncLocalStorage.set(key, result);
    await this.args.hooks?.hit?.(key, undefined);
    return result;
  }

  public async del(...keys: string[]): Promise<void> {
    for (const deleteKeys of chunk(keys, 2000)) {
      await this.client.del(...deleteKeys);
      for (const key of deleteKeys) {
        this.asyncLocalStorage.delete(key);
        await this.args.hooks?.delete?.(key, undefined);
      }
    }
  }

  public async keys(pattern?: string): Promise<string[]> {
    const results: string[] = [];
    if (!pattern) {
      pattern = "*";
    }

    for await (const keys of this.client.scanStream({ match: pattern, count: 100 })) {
      results.push(...keys);
    }

    return results.sort();
  }

  public async reset(): Promise<void> {
    this.asyncLocalStorage.clear();
    const keys = await this.keys();
    if (keys.length !== 0) {
      await this.del(...keys.map((key) => key.replace(new RegExp(`^${this.args.keyPrefix}`), "")));
    }
  }

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
      const results: Array<Buffer | null> = [];

      for (const keys of chunk(notFoundKeys, 2000)) {
        results.push(...((await this.client.mgetBuffer(...keys)) as Array<Buffer | null>));
      }

      for (let index = 0; index < notFoundKeys.length; index++) {
        const rawValue = results[index];
        if (!isNullOrUndefined(rawValue)) {
          const key = notFoundKeys[index];
          const value = unpack(rawValue) as T;
          map.set(key, value);

          await this.args.hooks?.hit?.(key, undefined);

          this.asyncLocalStorage.set(key, value);
        }
      }
    }
    return [...map.values()];
  }

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

        if (isNullOrUndefined(value)) {
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

        if (!isNullOrUndefined(ttl) && ttl !== -1) {
          this.client.setex(key, ttl, pack(value));
        } else {
          this.client.set(key, pack(value));
        }

        await this.args.hooks?.set?.(key, undefined, value, ttl);

        this.asyncLocalStorage.set(key, value);
      }
    }
  }

  public async hget<T>(key: string, field: string): Promise<T | undefined> {
    const asyncLocalStorageKey = `${key}:h:${field}`;

    let result: T | null | undefined = this.asyncLocalStorage.get<T>(asyncLocalStorageKey);

    if (!isNullOrUndefined(result)) {
      return result;
    }

    const rawResult = await this.client.hgetBuffer(key, field);

    if (isNullOrUndefined(rawResult)) {
      return;
    }

    result = unpack(rawResult) as T;

    this.asyncLocalStorage.set(asyncLocalStorageKey, result);
    await this.args.hooks?.hit?.(key, field);

    return result;
  }

  public async hset<T>(key: string, field: string, value: T): Promise<void> {
    if (isNullOrUndefined(value)) {
      return;
    }

    const asyncLocalStorageKey = `${key}:h:${field}`;

    this.client.hset(key, field, pack(value));

    this.asyncLocalStorage.set(asyncLocalStorageKey, value);

    await this.args.hooks?.set?.(key, field, value, undefined);
  }

  public async hdel(key: string, ...fields: string[]): Promise<void> {
    for (const deleteFields of chunk(fields, 2000)) {
      await this.client.hdel(key, ...deleteFields);
      for (const field of deleteFields) {
        this.asyncLocalStorage.delete(`${key}:h:${field}`);
        await this.args.hooks?.delete?.(key, field);
      }
    }
  }

  public async hgetall(key: string): Promise<Record<string, any>> {
    const rawResults = await this.client.hgetallBuffer(key);
    const results: Record<string, any> = {};

    for (const [key, value] of Object.entries(rawResults)) {
      results[key] = unpack(value) as any;
    }

    return results;
  }

  public async hkeys(key: string): Promise<string[]> {
    return await this.client.hkeys(key);
  }

  public async close(): Promise<void> {
    await this.client.quit();
    this.asyncLocalStorage.clear();
  }

  private isObject(value: any): value is Object {
    return value instanceof Object && value.constructor === Object;
  }
}

export const redisStore: CacheStoreFactory = {
  create: (args: LiteralObject): CacheStore => new RedisStore(args),
};
