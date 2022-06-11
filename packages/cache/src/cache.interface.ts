import { CacheModuleOptions as NestCacheModuleOptions, ModuleMetadata, Provider, Type } from "@nestjs/common";
import { RedisOptions } from "ioredis";

export type CacheModuleOptions<T = any> = NestCacheModuleOptions &
  T & {
    /**
     * Set if you want to set key to prefix string as version
     * e.g. {version}:key
     * @type {string}
     * @memberof CacheModuleOptions
     */
    cacheVersion?: string;

    /**
     * Sends a message to all instances when the cache has been deleted.
     * Use this when there may be multiple instances, such as Serverless with in-memory cache.
     * @type {RedisOptions}
     * @memberof CacheModuleOptions
     */
    pubsub?: RedisOptions;
  };

export interface CacheModuleOptionsFactory<T = any> {
  createCacheOptions():
    | Promise<CacheModuleOptions<T> | CacheModuleOptions<T>[]>
    | CacheModuleOptions<T>
    | CacheModuleOptions<T>[];
}
export interface CacheModuleAsyncOptions<T> extends Pick<ModuleMetadata, "imports"> {
  useExisting?: Type<CacheModuleOptionsFactory<T>>;
  useClass?: Type<CacheModuleOptionsFactory<T>>;
  useFactory?: (
    ...args: any[]
  ) => Promise<CacheModuleOptions<T> | CacheModuleOptions<T>[]> | CacheModuleOptions<T> | CacheModuleOptions<T>[];
  inject?: any[];
  extraProviders?: Provider[];
}

export interface CachePubSubMessage<T = any> {
  instanceId: string;
  data: T;
}

export interface CacheDeleteOptions {
  emitEvent: boolean;
}
