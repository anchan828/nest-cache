import { AsyncLocalStorage } from "async_hooks";
import { ASYNC_LOCAL_STORAGE_PREFIX } from "./constants";

export class AsyncLocalStorageService {
  constructor(private readonly asyncLocalStorage?: AsyncLocalStorage<Map<string, any>>) {}

  public get<T = any>(key: string): T | undefined {
    return this.getStore<T>()?.get(this.keyPrefix(key));
  }

  public set<T = any>(key: string, value: T): void {
    this.getStore<T>()?.set(this.keyPrefix(key), value);
  }

  public delete<T = any>(key: string): void {
    this.getStore<T>()?.delete(this.keyPrefix(key));
  }

  public clear(): void {
    const store = this.getStore();

    for (const key of store?.keys() || []) {
      if (key.startsWith(ASYNC_LOCAL_STORAGE_PREFIX)) {
        store?.delete(key);
      }
    }
  }

  private getStore<T>(): Map<string, T> | undefined {
    return this.asyncLocalStorage?.getStore() as Map<string, T>;
  }

  private keyPrefix(key: string): string {
    return `${ASYNC_LOCAL_STORAGE_PREFIX}${key}`;
  }
}
