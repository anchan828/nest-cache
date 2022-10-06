import { CACHE_MANAGER, Provider } from "@nestjs/common";
import { Cache, caching, multiCaching } from "cache-manager";
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
      const cacheStore = Array.isArray(options)
        ? multiCaching(await Promise.all(options.map((option) => createCacheStore(option))))
        : await createCacheStore(options);
      return cacheStore;
    },
    inject: [CACHE_MODULE_OPTIONS],
  };
}

async function createCacheStore(options: Record<string, any>): Promise<Cache<any>> {
  return caching(options.store ?? "memory", {
    ...defaultCacheOptions,
    ...(options || {}),
  });
}
