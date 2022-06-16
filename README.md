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

## Versioning

Sometimes you don't want to use the old cache when you update your application.

You can set prefix string to key as version (**v1:key**).

```ts
@Module({
  imports: [
    CacheModule.register({
      cacheVersion: "v1",
    }),
  ],
})
export class AppModule {}
```

If you set `v1` and call `CacheService.set("users/1", user)`, cache manager will save value to `v1:users/1` key, not `users/1`

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

## License

[MIT](LICENSE)
