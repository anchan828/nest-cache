import { CacheManager, patchMoreCommands } from "@anchan828/nest-cache-common";
import { AsyncLocalStorage } from "async_hooks";
import { caching } from "cache-manager";
import Redis from "ioredis";
import { pack, unpack } from "msgpackr";
import { AsyncLocalStorageService } from "./async-local-storage.service";
import { RedisStore, redisStore } from "./store";

describe.each([
  { name: "redis", port: 6379 },
  { name: "dragonfly", port: 6380 },
])("RedisStore: $name", ({ port }) => {
  let asyncLocalStorage: AsyncLocalStorage<Map<string, any>>;
  let asyncLocalStorageService: AsyncLocalStorageService;
  let store: CacheManager;
  let redis: RedisStore;
  let store2: CacheManager;
  let redis2: RedisStore;
  beforeEach(async () => {
    asyncLocalStorage = new AsyncLocalStorage();

    store = caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      port,
      asyncLocalStorage,
      db: 1,
      ttl: 5,
    } as any) as any as CacheManager;
    redis = (store as any).store;

    store2 = caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      port,
      asyncLocalStorage,
      db: 2,
      ttl: 5,
    } as any) as any as CacheManager;

    redis2 = store2.store;

    asyncLocalStorageService = store["store"]["asyncLocalStorage"];

    patchMoreCommands(store);
    patchMoreCommands(store2);
  });

  afterEach(async () => {
    await redis["redisCache"].flushdb();
    await redis.close();

    await redis2["redisCache"].flushdb();
    await redis2.close();
  });

  it("create cache instance", () => {
    expect(store).toBeDefined();
  });

  it("should set cache", async () => {
    const key = "test";
    await asyncLocalStorage.run(new Map(), async () => {
      expect(asyncLocalStorageService.get(key)).toBeUndefined();
      await expect(store.get(key)).resolves.toBeUndefined();
      const date = new Date();
      await store.set(key, {
        id: 1,
        name: "Name",
        nest: {
          id: 10,
        },
        date,
      });

      expect(asyncLocalStorageService.get(key)).toEqual({
        id: 1,
        name: "Name",
        nest: {
          id: 10,
        },
        date,
      });

      await expect(store.get(key)).resolves.toEqual({
        id: 1,
        name: "Name",
        nest: {
          id: 10,
        },
        date,
      });

      await expect(redis["redisCache"].getBuffer(key)).resolves.toEqual(
        pack({
          id: 1,
          name: "Name",
          nest: {
            id: 10,
          },
          date,
        }),
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const buf = await redis["redisCache"].getBuffer(key);
      expect(buf).not.toBeNull();
      if (buf != null) {
        expect(unpack(buf)).toEqual({
          id: 1,
          name: "Name",
          nest: {
            id: 10,
          },
          date,
        });
      }
    });
  });

  it("should set cache with ttl", async () => {
    const key = "test";
    await store.set(key, {
      id: 1,
      name: "Name",
      nest: {
        id: 10,
      },
    });

    await expect(store.get(key)).resolves.toEqual({
      id: 1,
      name: "Name",
      nest: {
        id: 10,
      },
    });
  });

  it("should set array", async () => {
    const key = "test";
    await store.set(key, [1, "2", true]);
    redis["asyncLocalStorage"].delete(key);
    await expect(redis.get(key)).resolves.toEqual([1, "2", true]);
  });

  it("should set ttl", async () => {
    const key = "test";
    await store.set(key, { id: 1 }, { ttl: 10 });
    await expect(redis["redisCache"].ttl(key)).resolves.toBeGreaterThan(5);
  });

  it("should set ttl: -1", async () => {
    const key = "test";
    await store.set(key, { id: 1 }, { ttl: -1 });
    await expect(redis["redisCache"].ttl(key)).resolves.toEqual(-1);
  });

  it("should delete cache", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      const key = "test";
      await store.set(key, key);
      await expect(store.del(key)).resolves.toBeUndefined();
      expect(asyncLocalStorageService.get(key)).toBeUndefined();
      await expect(store.get(key)).resolves.toBeUndefined();
    });
  });

  it("should get cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await store.set(key, key);
    }

    const results = await store.keys();

    expect(results.sort()).toEqual(["key1", "key2", "key3"]);
  });

  it("should reset cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await store.set(key, key);
    }
    let results = await store.keys();
    expect(results.sort()).toEqual(["key1", "key2", "key3"]);
    await store.reset();
    results = await store.keys();
    expect(results.sort()).toEqual([]);
  });

  it("should change key prefix", async () => {
    const store = caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      ttl: 10,
      db: 3,
      keyPrefix: "changed:",
    } as any) as any as CacheManager;
    const key = "key";
    await store.set(key, key);
    const results = await store.keys();
    expect(results.sort()).toEqual(["changed:key"]);

    const redis = (store as any).store.redisCache as Redis;
    await redis.quit();
  });

  it("should mget", async () => {
    for (const key of ["key1", "key2", "key4"]) {
      await store.set(key, `${key}:value`);
    }

    await expect(store.mget(...["key1", "key2", "key3", "key4"])).resolves.toEqual([
      "key1:value",
      "key2:value",
      undefined,
      "key4:value",
    ]);
  });

  it("should mset", async () => {
    await store.mset("key1", "key1:value", "key2", "key2:value", "key3", "key3:value", { ttl: 1000 });
    await expect(store.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(store.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should mset with options", async () => {
    await store.mset("key1", "key1:value", "key2", "key2:value", "key3", "key3:value", { ttl: 1234 });
    await expect(store.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(store.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should mset", async () => {
    await store.mset("key1", "key1:value", "key2", "key2:value", "key3", "key3:value", { ttl: 1000 });
    await expect(store.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(store.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should mset with options", async () => {
    await store.mset("key1", "key1:value", "key2", "key2:value", "key3", "key3:value", { ttl: 1234 });
    await expect(store.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(store.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should hget", async () => {
    await store.hset("key", "field", "value");
    await expect(store.hget("key", "field")).resolves.toEqual("value");
  });

  it("should hset", async () => {
    await store.hset("key", "field", "value");
    await expect(store.keys()).resolves.toEqual(["key"]);
    await expect(store.hkeys("key")).resolves.toEqual(["field"]);
    await expect(store.hgetall("key")).resolves.toEqual({ field: "value" });
  });

  it("should hdel", async () => {
    await store.hset("key", "field", "value");
    await expect(store.hget("key", "field")).resolves.toEqual("value");
    await expect(store.hdel("key", "field")).resolves.toBeUndefined();
    await expect(store.hget("key", "field")).resolves.toBeUndefined();
  });
});
