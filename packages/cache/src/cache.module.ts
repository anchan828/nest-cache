import { CacheManager } from "@anchan828/nest-cache-common";
import {
  CacheModule as NestCacheModule,
  CACHE_MANAGER,
  DynamicModule,
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
  OnModuleInit,
  Provider,
  Type,
} from "@nestjs/common";
import { CachePubSubService } from "./cache-pubsub.service";
import { CacheEventEmitter } from "./cache.emitter";
import { CacheModuleAsyncOptions, CacheModuleOptions, CacheModuleOptionsFactory } from "./cache.interface";
import { CacheService } from "./cache.service";
import { CACHE_MODULE_OPTIONS } from "./constants";

/**
 * Module that provides cache dependency.
 * This module wraps the official CacheModule.
 * @export
 * @class CacheModule
 */
@Global()
@Module({})
export class CacheModule implements OnModuleInit, OnApplicationShutdown {
  private pubsubServices: CachePubSubService[] = [];

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: CacheManager,
    private readonly emitter: CacheEventEmitter,
    @Inject(CACHE_MODULE_OPTIONS)
    private readonly options: CacheModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    if (Array.isArray(this.options)) {
      for (const opt of this.options) {
        if (opt.pubsub) {
          this.pubsubServices.push(await new CachePubSubService(this.emitter).init(opt.pubsub));
        }
      }
    } else if (this.options.pubsub) {
      this.pubsubServices.push(await new CachePubSubService(this.emitter).init(this.options.pubsub));
    }
  }

  async onApplicationShutdown(): Promise<void> {
    for (const pubsubService of this.pubsubServices) {
      await pubsubService.close();
    }
    this.emitter.removeAllListeners();
    await this.cacheManager?.store?.close?.();
  }

  /**
   * Configure the cache dependency statically.
   *
   * @static
   * @param {CacheModuleOptions} [options={}]
   * @returns {DynamicModule}
   * @memberof CacheModule
   */
  public static register<T>(options?: CacheModuleOptions<T> | CacheModuleOptions<T>[]): DynamicModule {
    const providers: Provider[] = [...this.providers, { provide: CACHE_MODULE_OPTIONS, useValue: options || {} }];

    return {
      module: CacheModule,
      imports: [NestCacheModule.register((options as any) || {})],
      providers: [...providers, CacheEventEmitter],
      exports: providers,
    };
  }

  /**
   * Configure the cache dependency dynamically.
   *
   * @static
   * @param {CacheModuleAsyncOptions} options
   * @returns {DynamicModule}
   * @memberof CacheModule
   */
  public static registerAsync<T>(options: CacheModuleAsyncOptions<T>): DynamicModule {
    const providers: Provider[] = [...this.providers, ...this.createAsyncProviders<T>(options)];
    return {
      module: CacheModule,
      imports: [NestCacheModule.registerAsync(options), ...(options.imports || [])],
      providers: [...providers, CacheEventEmitter],
      exports: providers,
    };
  }

  private static createAsyncProviders<T>(options: CacheModuleAsyncOptions<T>): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider<T>(options)];
    }
    const asyncProviders = [this.createAsyncOptionsProvider<T>(options)];

    if (options.useClass) {
      asyncProviders.push({
        provide: options.useClass,
        useClass: options.useClass,
      });
    }

    return asyncProviders;
  }

  private static createAsyncOptionsProvider<T>(options: CacheModuleAsyncOptions<T>): Provider {
    if (options.useFactory) {
      return {
        provide: CACHE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const injects: Type<CacheModuleOptionsFactory<T>>[] = [];
    const inject = options.useExisting || options.useClass;

    if (inject) {
      injects.push(inject);
    }

    return {
      provide: CACHE_MODULE_OPTIONS,
      useFactory: async (optionsFactory: CacheModuleOptionsFactory<T>) => optionsFactory.createCacheOptions(),
      inject: injects,
    };
  }

  private static providers: Provider[] = [CacheService];
}
