import { CacheModuleOptions as NestCacheModuleOptions } from "@nestjs/common";

export type CacheModuleOptions<T = any> = NestCacheModuleOptions &
  T & {
    /**
     * Set if you want to set key to prefix string as version
     * e.g. {version}:key
     * @type {string}
     * @memberof CacheModuleOptions
     */
    cacheVersion?: string;
  };

export interface CacheModuleOptionsFactory<T = any> {
  createCacheOptions():
    | Promise<CacheModuleOptions<T> | CacheModuleOptions<T>[]>
    | CacheModuleOptions<T>
    | CacheModuleOptions<T>[];
}
