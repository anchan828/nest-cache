/* eslint-disable prefer-rest-params */
import { CacheManager } from "@anchan828/nest-cache-common";
import { MemoryConfig, memoryStore as internalMemoryStore, MemoryStore as InternalMemoryStore } from "cache-manager";
import { CACHE_STORE_NAME } from "./constants";

export class MemoryStore implements CacheManager {
  public readonly name: string = CACHE_STORE_NAME;

  readonly store: InternalMemoryStore;

  constructor(args: MemoryConfig) {
    this.store = internalMemoryStore(args);
  }

  public async ttl(key: string): Promise<number> {
    return this.store.ttl(key);
  }

  public async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    return this.store.set(key, value, ttl);
  }

  public async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  public async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.store.del(key);
    }
  }

  public async keys(pattern?: string): Promise<string[]> {
    let keys = await this.store.keys(pattern);

    if (pattern) {
      keys = keys.filter((key) => key);
      const inMemoryPattern = pattern.replace(new RegExp(/\*/, "g"), ".*");
      keys = keys.filter((key) => key.match(`^${inMemoryPattern}`));
    }

    return keys.sort();
  }

  public async reset(): Promise<void> {
    return this.store.reset();
  }

  public async mget<T>(...keys: string[]): Promise<Array<T | undefined>> {
    return this.store.mget(...keys) as unknown as Array<T | undefined>;
  }

  public async mset<T>(keyOrValues: [string, T][], ttl?: number): Promise<void> {
    return this.store.mset(keyOrValues, ttl);
  }

  public async mdel(...keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.store.del(key);
    }
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
    this.store.reset();
  }
}

export function memoryStore(args: MemoryConfig): MemoryStore {
  return new MemoryStore(args);
}
