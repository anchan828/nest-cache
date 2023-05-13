import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Provider } from "@nestjs/common";
import { Cache, caching } from "cache-manager";
import { CacheModuleOptions } from "./cache.interface";
import { CACHE_MODULE_OPTIONS } from "./constants";

const defaultCacheOptions = {
  ttl: 5,
  max: 100,
};

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
    ...defaultCacheOptions,
    ...options,
  });
}
