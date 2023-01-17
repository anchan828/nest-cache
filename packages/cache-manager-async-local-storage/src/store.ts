/* eslint-disable prefer-rest-params */
import { AsyncLocalStorageService, CacheManager, isNullOrUndefined } from "@anchan828/nest-cache-common";
import { AsyncLocalStorage } from "async_hooks";
import { AsyncLocalStorageStoreArgs } from "./store.interface";

export class AsyncLocalStorageStore implements CacheManager {
  readonly store: AsyncLocalStorage<Map<string, any>>;

  private readonly asyncLocalStorage: AsyncLocalStorageService;

  constructor(private readonly args: AsyncLocalStorageStoreArgs) {
    this.asyncLocalStorage = new AsyncLocalStorageService(args.asyncLocalStorage);
    this.store = args.asyncLocalStorage;
  }

  public async ttl(key: string): Promise<number> {
    if (typeof key !== "string") {
      return 0;
    }
    return -1;
  }

  public async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (typeof key !== "string") {
      return;
    }

    if (isNullOrUndefined(value)) {
      return;
    }

    if (isNullOrUndefined(ttl) && !isNullOrUndefined(this.args.ttl)) {
      ttl = this.args.ttl;
    }

    if (ttl === 0) {
      return;
    }

    this.asyncLocalStorage.set(key, value);

    await this.args.hooks?.set?.(key, undefined, value, ttl);
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const result: T | null | undefined = this.asyncLocalStorage.get<T>(key);

    if (!isNullOrUndefined(result)) {
      await this.args.hooks?.hit?.(key, undefined);
    }

    return result;
  }

  public async del(key: string): Promise<void> {
    if (typeof key !== "string") {
      return;
    }
    this.asyncLocalStorage.delete(key);
    await this.args.hooks?.delete?.(key, undefined);
  }

  public async keys(pattern?: string): Promise<string[]> {
    const keys = this.asyncLocalStorage.keys(pattern).sort();

    return keys.map((key) => key.split(":h:")[0]);
  }

  public async reset(): Promise<void> {
    this.asyncLocalStorage.clear();
  }

  public async mget<T>(...keys: string[]): Promise<Array<T | undefined>> {
    const map = new Map<string, T | undefined>(keys.map((key) => [key, undefined]));

    for (const key of map.keys()) {
      const result = this.asyncLocalStorage.get(key);
      if (!isNullOrUndefined(result)) {
        map.set(key, result);
        await this.args.hooks?.hit?.(key, undefined);
      }
    }

    return [...map.values()];
  }

  public async mset<T>(keyOrValues: [string, T][], ttl?: number): Promise<void> {
    if (isNullOrUndefined(ttl) && !isNullOrUndefined(this.args.ttl)) {
      ttl = this.args.ttl;
    }

    if (ttl === 0) {
      return;
    }

    for (const [key, value] of keyOrValues) {
      if (typeof key !== "string") {
        continue;
      }

      if (isNullOrUndefined(value)) {
        continue;
      }

      await this.args.hooks?.set?.(key, undefined, value, ttl);

      this.asyncLocalStorage.set(key, value);
    }
  }

  public async mdel(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.asyncLocalStorage.delete(key);
      await this.args.hooks?.delete?.(key, undefined);
    }
  }

  public async hget<T>(key: string, field: string): Promise<T | undefined> {
    if (typeof key !== "string" || typeof field !== "string") {
      return;
    }

    const asyncLocalStorageKey = `${key}:h:${field}`;

    const result: T | null | undefined = this.asyncLocalStorage.get<T>(asyncLocalStorageKey);

    if (!isNullOrUndefined(result)) {
      await this.args.hooks?.hit?.(key, field);
    }

    await this.args.hooks?.hit?.(key, field);

    return result;
  }

  public async hset<T>(key: string, field: string, value: T): Promise<void> {
    if (typeof key !== "string" || typeof field !== "string" || isNullOrUndefined(value)) {
      return;
    }

    const asyncLocalStorageKey = `${key}:h:${field}`;

    this.asyncLocalStorage.set(asyncLocalStorageKey, value);

    await this.args.hooks?.set?.(key, field, value, undefined);
  }

  public async hdel(key: string, ...fields: string[]): Promise<void> {
    if (typeof key !== "string") {
      return;
    }
    for (const field of fields) {
      this.asyncLocalStorage.delete(`${key}:h:${field}`);
      await this.args.hooks?.delete?.(key, field);
    }
  }

  public async hgetall(key: string): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    if (typeof key !== "string") {
      return results;
    }
    const hkey = `${key}:h:`;
    const keys = this.asyncLocalStorage.keys(`${hkey}*`);

    for (const key of keys) {
      const field = key.replace(hkey, "");
      results[field] = this.asyncLocalStorage.get(key);
    }

    return results;
  }

  public async hkeys(key: string): Promise<string[]> {
    if (typeof key !== "string") {
      return [];
    }

    const hkey = `${key}:h:`;
    const keys = this.asyncLocalStorage.keys(`${hkey}*`);
    return keys.map((key) => key.replace(hkey, ""));
  }

  public async close(): Promise<void> {
    this.asyncLocalStorage.clear();
  }
}

export function asyncLocalStorageStore(args: AsyncLocalStorageStoreArgs): AsyncLocalStorageStore {
  return new AsyncLocalStorageStore(args);
}
