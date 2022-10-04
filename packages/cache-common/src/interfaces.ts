import { Store } from "cache-manager";
export type CacheManager = Store & {
  /**
   * Custom methods (named based on Redis commands)
   */
  hget<T>(key: string, field: string): Promise<T | undefined>;
  hset<T>(key: string, field: string, value: T): Promise<void>;
  hdel(key: string, ...fields: string[]): Promise<void>;
  hgetall(key: string): Promise<Record<string, any>>;
  hkeys(key: string): Promise<string[]>;

  readonly store: any;
};
