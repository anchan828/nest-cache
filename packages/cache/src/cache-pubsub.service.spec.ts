import { redisStore, RedisStoreArgs } from "@anchan828/nest-cache-manager-ioredis";
import { Test, TestingModule } from "@nestjs/testing";
import * as LRUCache from "lru-cache";
import { setTimeout } from "timers/promises";
import { CacheModule } from "./cache.module";
import { CacheService } from "./cache.service";
describe("CachePubSubService", () => {
  let apps: TestingModule[] = [];
  beforeEach(async () => {
    apps = [];
    for (let i = 0; i < 10; i++) {
      const module = await Test.createTestingModule({
        imports: [
          CacheModule.register<RedisStoreArgs>({
            store: redisStore,
            host: process.env.REDIS_HOST || "localhost",
            pubsub: { host: "localhost" },
            inMemory: {
              enabled: true,
              ttl: 60 * 60,
            },
          }),
        ],
      }).compile();

      const app = await module.init();
      apps.push(app);
    }
  });

  afterEach(async () => {
    await setTimeout(500);
    await Promise.all(apps.map((app) => app.close()));
  });

  it("should clear cache in all apps", async () => {
    const service = apps[0].get(CacheService);

    await Promise.all(apps.map((app) => app.get(CacheService).set("key1", "A")));

    expect(
      apps
        .map((app) => app.get(CacheService)["cacheManager"])
        .map((manager) => Reflect.get(manager, "store")?.memoryCache)
        .filter((lru): lru is LRUCache<string, any> => lru)
        .map((lru) => Array.from(lru.keys())),
    ).toEqual([["key1"], ["key1"], ["key1"], ["key1"], ["key1"], ["key1"], ["key1"], ["key1"], ["key1"], ["key1"]]);

    expect(
      apps
        .map((app) => app.get(CacheService)["cacheManager"])
        .map((manager) => Reflect.get(manager, "store")?.memoryCache)
        .filter((lru): lru is LRUCache<string, any> => lru)
        .map((lru) => Array.from(lru.values())),
    ).toEqual([["A"], ["A"], ["A"], ["A"], ["A"], ["A"], ["A"], ["A"], ["A"], ["A"]]);

    await service.delete("key1");
    await setTimeout(1000);

    expect(
      apps
        .map((app) => app.get(CacheService)["cacheManager"])
        .map((manager) => Reflect.get(manager, "store")?.memoryCache)
        .filter((lru): lru is LRUCache<string, any> => lru)
        .map((lru) => Array.from(lru.values())),
    ).toEqual([[], [], [], [], [], [], [], [], [], []]);
  });
});
