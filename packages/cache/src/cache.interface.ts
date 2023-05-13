import { CacheModuleOptions as NestCacheModuleOptions } from "@nestjs/cache-manager";

export type CacheModuleOptions<T = any> = NestCacheModuleOptions & T;

export interface CacheModuleOptionsFactory<T = any> {
  createCacheOptions():
    | Promise<CacheModuleOptions<T> | CacheModuleOptions<T>[]>
    | CacheModuleOptions<T>
    | CacheModuleOptions<T>[];
}
