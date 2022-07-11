import { CACHE_MANAGER, Provider } from "@nestjs/common";
import { caching } from "cache-manager";
import { CacheModuleOptions } from "./cache.interface";
import { CACHE_MODULE_OPTIONS } from "./constants";

const defaultCacheOptions = {
  ttl: 5,
  max: 100,
  store: "memory",
};

export function createCacheManager(): Provider {
  return {
    provide: CACHE_MANAGER,
    useFactory: (options: CacheModuleOptions) => {
      return caching({ ...defaultCacheOptions, ...(options || {}) });
    },
    inject: [CACHE_MODULE_OPTIONS],
  };
}
