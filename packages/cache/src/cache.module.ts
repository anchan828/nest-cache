import { CacheManager } from "@anchan828/nest-cache-common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigurableModuleBuilder, Global, Inject, Module, OnModuleDestroy } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { CacheModuleOptions } from "./cache.interface";
import { CacheMiddlewareService } from "./cache.middleware";
import { createCacheManager } from "./cache.provider";
import { CacheService } from "./cache.service";
import { CACHE_MODULE_OPTIONS } from "./constants";

export const { ConfigurableModuleClass: CacheConfigurableModuleClass } =
  new ConfigurableModuleBuilder<CacheModuleOptions>({
    optionsInjectionToken: CACHE_MODULE_OPTIONS,
  })
    .setFactoryMethodName("createCacheOptions")
    .setExtras({}, (definition) => {
      if (!definition.imports) {
        definition.imports = [];
      }

      if (!definition.exports) {
        definition.exports = [];
      }

      definition.providers?.push(CacheService, CacheMiddlewareService);
      definition.exports.push(CacheService);

      const options = definition.providers?.find((p: any) => p.provide && p.provide === CACHE_MODULE_OPTIONS);

      if (options) {
        definition.exports.push(options);
      }

      return definition;
    })
    .build();

/**
 * Module that provides cache dependency.
 *
 * @export
 * @class CacheModule
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [createCacheManager()],
  exports: [CACHE_MANAGER],
})
export class CacheModule extends CacheConfigurableModuleClass implements OnModuleDestroy {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: CacheManager,
  ) {
    super();
  }

  async onModuleDestroy(): Promise<void> {
    await this.cacheManager?.store?.close?.();
  }
}
