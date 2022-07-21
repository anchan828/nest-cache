/* eslint-disable prefer-rest-params */
import { CacheManager, CacheManagerSetOptions } from "@anchan828/nest-cache-common";
import { CacheStore, CacheStoreFactory, LiteralObject } from "@nestjs/common";
import { caching } from "cache-manager";
import { CACHE_STORE_NAME } from "./constants";
import { MemoryStoreArgs } from "./store.interface";

export class MemoryStore implements CacheManager {
  public readonly name: string = CACHE_STORE_NAME;

  private readonly memoryCache: CacheManager;

  constructor(args: MemoryStoreArgs) {
    this.memoryCache = caching({
      ...args,
      store: "memory",
    }) as unknown as CacheManager;
  }

  public async set<T = any>(key: string, value: T, options?: CacheManagerSetOptions): Promise<void> {
    return this.memoryCache.set(key, value, options);
  }

  public async get<T>(key: string): Promise<T | undefined> {
    return this.memoryCache.get(key);
  }

  public async del(...keys: string[]): Promise<void> {
    return this.memoryCache.del(...keys);
  }

  public async keys(pattern?: string): Promise<string[]> {
    const keys = await this.memoryCache.keys(pattern);
    return keys.sort();
  }

  public async reset(): Promise<void> {
    return this.memoryCache.reset();
  }

  public async mget<T>(...keysOrOptions: string[]): Promise<Array<T | undefined>> {
    return this.memoryCache.mget(...keysOrOptions);
  }

  public async mset<T>(...keyOrValues: [...(string | T)[], CacheManagerSetOptions | undefined]): Promise<void> {
    return this.memoryCache.mset(...keyOrValues);
  }

  public async hget<T>(key: string, field: string): Promise<T | undefined> {
    const record = await this.get(key);

    if (!record) {
      return;
    }

    if (typeof record !== "object") {
      return;
    }

    return (record as Record<string, any>)[field];
  }

  public async hset<T>(key: string, field: string, value: T): Promise<void> {
    let record: Record<string, any> | undefined = await this.get(key);

    if (!record) {
      record = {};
    }

    record[field] = value;

    await this.set(key, record);
  }

  public async hdel(key: string, ...fields: string[]): Promise<void> {
    const record: Record<string, any> | undefined = await this.get(key);

    if (!record) {
      return;
    }

    for (const field of fields) {
      delete record[field];
    }

    await this.set(key, record);
  }

  public async hgetall(key: string): Promise<Record<string, any>> {
    const record: Record<string, any> | undefined = await this.get(key);
    return record || {};
  }

  public async hkeys(key: string): Promise<string[]> {
    const record: Record<string, any> | undefined = await this.get(key);

    if (!record) {
      return [];
    }

    return Object.keys(record);
  }

  public async close(): Promise<void> {
    this.memoryCache.reset();
  }
}

export const memoryStore: CacheStoreFactory = {
  create: (args: LiteralObject): CacheStore => new MemoryStore(args as MemoryStoreArgs),
};
