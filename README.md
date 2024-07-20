# @anchan828/nest-cache

![npm](https://img.shields.io/npm/v/@anchan828/nest-cache.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-cache.svg)

A cache module for Nest framework (node.js) https://nestjs.com/

## Installation

```bash
$ npm i --save @anchan828/nest-cache
```

## Quick Start

- Import module

```ts
@Module({
  imports: [CacheModule.register()],
})
export class AppModule {}
```

```ts
@Injectable()
export class ExampleService {
  constructor(private readonly cacheService: CacheService) {}

  private items: Item[] = Array(5)
    .fill(0)
    .map((_, index) => ({ id: index, name: `Item ${index}` }));

  public async getItems(userId: number): Promise<Item[]> {
    const cacheKey = `users/${userId}/items`;

    const cache = await this.cacheService.get<Item[]>(cacheKey);

    if (cache) {
      return cache;
    }

    await this.cacheService.set(cacheKey, this.items);

    return this.items;
  }
}
```

## Middleware

You can add middleware that is executed just before calling the cache method. It can be used as an interceptor to process the cache key or the value to be stored, or to define dependencies on the cache to manipulate other caches under certain conditions.

```ts
@Injectable()
export class ExampleService {
  constructor(private readonly cacheService: CacheService) {}

  public async update(userId: number, age: number): Promise<void> {
    await this.cacheService.set(`users/${userId}`, age, 10, {
      /**
       * You can pass information to be processed under specific conditions used in middleware.
       */
      source: { userId },
    });
  }
}

@CacheMiddleware({
  /**
   * The priority of the middleware. The higher the number, the low the priority.
   */
  priority: 1,
})
class TestCacheMiddleware implements ICacheMiddleware {
  constructor(private readonly cacheService: CacheService) {}
  /**
   * If you want to set a hook for set, implement the set method.
   */
  async set(context: CacheContext<"set">): Promise<void> {
    /**
     * Change data
     */
    context.key = `version-1/${context.key}`;
    context.value = { data: context.value };
    context.ttl = 1000;

    /**
     * Get the source passed from the set method
     */
    const source = context.getSource<{ userId: number }>();

    /**
     * Manage other caches under certain conditions
     */
    if (source?.userId === 1) {
      this.cacheService.delete("another-cache-key");
    }
  }

  /**
   * You can define middleware for most methods.
   */
  // ttl?(context: CacheContext<"ttl">): Promise<void>;
  // delete?(context: CacheContext<"delete">): Promise<void>;
  // mget?(context: CacheContext<"mget">): Promise<void>;
  // mset?(context: CacheContext<"mset">): Promise<void>;
  // mdel?(context: CacheContext<"mdel">): Promise<void>;
  // hget?(context: CacheContext<"hget">): Promise<void>;
  // hset?(context: CacheContext<"hset">): Promise<void>;
  // hdel?(context: CacheContext<"hdel">): Promise<void>;
  // hgetall?(context: CacheContext<"hgetall">): Promise<void>;
  // hkeys?(context: CacheContext<"hkeys">): Promise<void>;
}
```

## Using In-memory

@anchan828/nest-cache has been extended to make more Redis commands available. In line with this, the memory store also provides compatibility features. Please use [@anchan828/nest-cache-manager-memory](https://www.npmjs.com/package/@anchan828/nest-cache-manager-memory) instead of the default memory store.

```ts
import { memoryStore } from "@anchan828/nest-cache-manager-memory";

@Module({
  imports: [
    CacheModule.register({
      store: memoryStore,
    }),
  ],
})
export class AppModule {}
```

## Using Redis

You can use Redis instead of in-memory cache. Please use [@anchan828/nest-cache-manager-ioredis](https://www.npmjs.com/package/@anchan828/nest-cache-manager-ioredis)

_@anchan828/nest-cache-manager-ioredis_ has the ability to cache Redis results in AsyncLocalStorage. This is useful for elements that need to be accessed frequently.

```ts
import { redisStore } from "@anchan828/nest-cache-manager-ioredis";
const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();
@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: "localhost",
      asyncLocalStorage,
    }),
  ],
})
export class AppModule {}
```

## Supported for more Redis commands

- hget
- hset
- hdel
- hgetall
- hkeys

## License

[MIT](LICENSE)
