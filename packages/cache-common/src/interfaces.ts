import { CacheStore } from "@nestjs/common";

export interface CacheManagerSetOptions {
  ttl?: number;
}

export type CacheManager = CacheStore & {
  name: string;
  set<T>(key: string, value: T, options?: CacheManagerSetOptions): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  keys(pattern?: string): Promise<string[]>;
  reset(): Promise<void>;
  mget<T>(...keys: string[]): Promise<Array<T | undefined>>;
  mget<T>(...keysOrOptions: string[]): Promise<Array<T | undefined>>;

  /**
   * You can set options to last argument
   */
  mset<T>(...keyOrValues: [...(string | T)[], CacheManagerSetOptions | undefined]): Promise<void>;
  del(...keys: string[]): Promise<void>;

  /**
   * Custom methods (named based on Redis commands)
   */
  hget<T>(key: string, field: string): Promise<T | undefined>;
  hset<T>(key: string, field: string, value: T): Promise<void>;
  hdel(key: string, ...fields: string[]): Promise<void>;
  hgetall(key: string): Promise<Record<string, any>>;
  hkeys(key: string): Promise<string[]>;

  store?: any;
};
