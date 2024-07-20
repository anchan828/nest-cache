import { CacheOptions } from "@nestjs/cache-manager";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";

export interface CacheMiddlewareOptions {
  priority?: number;
}

type CacheContextType = {
  ttl: { key: string };
  get: { key: string };
  set: { key: string; value: any; ttl?: number };
  delete: { key: string };
  mget: { keys: string[] };
  mset: { record: Record<string, any>; ttl?: number };
  mdel: { keys: string[] };
  hget: { key: string; field: string };
  hset: { key: string; field: string; value: any };
  hdel: { key: string; fields: string[] };
  hgetall: { key: string };
  hkeys: { key: string };
};

type CacheContextOptions = {
  getSource<U>(): U | undefined;
};

export type CacheContext<T extends keyof CacheContextType = keyof CacheContextType> = CacheContextType[T] &
  CacheContextOptions;

export interface ICacheMiddleware {
  ttl?(context: CacheContext<"ttl">): Promise<void>;
  get?(context: CacheContext<"get">): Promise<void>;
  set?(context: CacheContext<"set">): Promise<void>;
  delete?(context: CacheContext<"delete">): Promise<void>;
  mget?(context: CacheContext<"mget">): Promise<void>;
  mset?(context: CacheContext<"mset">): Promise<void>;
  mdel?(context: CacheContext<"mdel">): Promise<void>;
  hget?(context: CacheContext<"hget">): Promise<void>;
  hset?(context: CacheContext<"hset">): Promise<void>;
  hdel?(context: CacheContext<"hdel">): Promise<void>;
  hgetall?(context: CacheContext<"hgetall">): Promise<void>;
  hkeys?(context: CacheContext<"hkeys">): Promise<void>;
}

export function createCacheContext<T extends keyof ICacheMiddleware = keyof ICacheMiddleware>(
  args: Omit<CacheContext<T>, keyof CacheContextOptions>,
  options?: CacheOptions,
): CacheContext<T> {
  return {
    ...args,
    getSource: () => {
      return options?.source;
    },
  } as any;
}

export const CacheMiddleware = DiscoveryService.createDecorator<CacheMiddlewareOptions>();

type CacheMiddlewareInstance = { instance: ICacheMiddleware; options: CacheMiddlewareOptions };

@Injectable()
export class CacheMiddlewareService implements OnModuleInit {
  private middlewares: CacheMiddlewareInstance[] = [];

  constructor(private readonly discovery: DiscoveryService) {}

  async onModuleInit(): Promise<void> {
    this.middlewares = this.discovery.getProviders({ metadataKey: CacheMiddleware.KEY }).map((wrapper) => ({
      instance: wrapper.instance,
      options: this.discovery.getMetadataByDecorator(CacheMiddleware, wrapper) || {},
    }));
  }

  public async runMiddlewares<T extends keyof ICacheMiddleware = keyof ICacheMiddleware>(
    type: T,
    context: CacheContext<T>,
  ): Promise<void> {
    const middlewares = this.middlewares
      .filter((middleware) => middleware.instance[type])
      .sort((a, b) => (a.options.priority || 0) - (b.options.priority || 0));

    for (const middleware of middlewares) {
      await (middleware.instance[type] as any)(context);
    }
  }
}
