import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Provider } from "@nestjs/common";
import { Cache, caching } from "cache-manager";
import { CacheModuleOptions } from "./cache.interface";
import { CACHE_MODULE_OPTIONS, DEFAULT_CACHE_OPTIONS } from "./constants";

export function createCacheManager(): Provider {
  return {
    provide: CACHE_MANAGER,
    useFactory: async (options: CacheModuleOptions) => {
      return await createCacheStore(options);
    },
    inject: [CACHE_MODULE_OPTIONS],
  };
}

async function createCacheStore(options: Record<string, any>): Promise<Cache<any>> {
  return caching(options.store ?? "memory", {
    ...DEFAULT_CACHE_OPTIONS,
    ...options,
  });
}
