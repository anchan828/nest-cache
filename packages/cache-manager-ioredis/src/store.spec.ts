import { patchMoreCommands } from "@anchan828/nest-cache-common";
import { AsyncLocalStorage } from "async_hooks";
import { Cache, caching } from "cache-manager";
import Redis from "ioredis";
import { pack, unpack } from "msgpackr";
import { AsyncLocalStorageService } from "./async-local-storage.service";
import { RedisStore } from "./store";
describe.each([
  { name: "ioredis", client: new Redis({ db: 1, port: 6379, host: process.env.REDIS_HOST || "localhost" }) },
  {
    name: "ioredis-mock",
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    client: new (require("ioredis-mock"))(),
  },
  { name: "dragonfly", client: new Redis({ db: 1, port: 6380, host: process.env.REDIS_HOST || "localhost" }) },
])("RedisStore: $name", ({ client }) => {
  let asyncLocalStorage: AsyncLocalStorage<Map<string, any>>;
  let asyncLocalStorageService: AsyncLocalStorageService;
  let cache: Cache<RedisStore>;
  let cache2: Cache<RedisStore>;

  beforeEach(async () => {
    asyncLocalStorage = new AsyncLocalStorage();

    cache = await caching(new RedisStore({ client, asyncLocalStorage, ttl: 5 }));

    cache2 = await caching(new RedisStore({ asyncLocalStorage, client: cache.store["client"], ttl: 10 }));

    asyncLocalStorageService = cache.store["asyncLocalStorage"];

    patchMoreCommands(cache);

    if (client.status === "end") {
      await client.connect();
    }
  });

  afterEach(async () => {
    await client.flushdb();
  });

  afterAll(async () => {
    await cache.store.close();
  });

  it("create cache instance", () => {
    expect(cache).toBeDefined();
  });

  it("should set cache", async () => {
    const key = "test";
    await asyncLocalStorage.run(new Map(), async () => {
      expect(asyncLocalStorageService.get(key)).toBeUndefined();
      await expect(cache.get(key)).resolves.toBeUndefined();
      const date = new Date();
      await cache.set(key, {
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

      await expect(cache.get(key)).resolves.toEqual({
        id: 1,
        name: "Name",
        nest: {
          id: 10,
        },
        date,
      });

      await expect(cache.store["client"].getBuffer(key)).resolves.toEqual(
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
      const buf = await cache.store["client"].getBuffer(key);
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
    await cache.set(key, {
      id: 1,
      name: "Name",
      nest: {
        id: 10,
      },
    });

    await expect(cache.get(key)).resolves.toEqual({
      id: 1,
      name: "Name",
      nest: {
        id: 10,
      },
    });
  });

  it("should set array", async () => {
    const key = "test";
    await cache.set(key, [1, "2", true]);
    cache.store["asyncLocalStorage"].delete(key);
    await expect(cache.store.get(key)).resolves.toEqual([1, "2", true]);
  });

  it("should set ttl", async () => {
    const key = "test";
    await cache.set(key, { id: 1 }, 10);
    await expect(cache.store["client"].ttl(key)).resolves.toBeGreaterThan(5);
  });

  it("should set ttl: -1", async () => {
    const key = "test";
    await cache.set(key, { id: 1 }, -1);
    await expect(cache.store["client"].ttl(key)).resolves.toEqual(-1);
  });

  it("should delete cache", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      const key = "test";
      await cache.set(key, key);
      await expect(cache.del(key)).resolves.toBeUndefined();
      expect(asyncLocalStorageService.get(key)).toBeUndefined();
      await expect(cache.get(key)).resolves.toBeUndefined();
    });
  });

  it("should get cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await cache.set(key, key);
    }

    const results = await cache.store.keys();

    expect(results.sort()).toEqual(["key1", "key2", "key3"]);
  });

  it("should reset cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await cache.set(key, key);
    }
    let results = await cache.store.keys();
    expect(results.sort()).toEqual(["key1", "key2", "key3"]);
    await cache.reset();
    results = await cache.store.keys();
    expect(results.sort()).toEqual([]);
  });

  it("should change key prefix", async () => {
    const cache = await caching(
      new RedisStore({ host: process.env.REDIS_HOST || "localhost", ttl: 10, db: 3, keyPrefix: "changed:" }),
    );
    const key = "key";
    await cache.set(key, key);
    const results = await cache.store.keys();
    expect(results.sort()).toEqual(["changed:key"]);

    const redis = cache.store["client"];
    await redis.quit();
  });

  it("should mget", async () => {
    for (const key of ["key1", "key2", "key4"]) {
      await cache.set(key, `${key}:value`);
    }

    await expect(cache.store.mget(...["key1", "key2", "key3", "key4"])).resolves.toEqual([
      "key1:value",
      "key2:value",
      undefined,
      "key4:value",
    ]);
  });

  it("should mset", async () => {
    await cache.store.mset(
      [
        ["key1", "key1:value"],
        ["key2", "key2:value"],
        ["key3", "key3:value"],
      ],
      1000,
    );
    await expect(cache.store.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(cache.store.mget(...["key1", "key2", "key3"])).resolves.toEqual([
      "key1:value",
      "key2:value",
      "key3:value",
    ]);
  });

  it("should mdel", async () => {
    await cache.store.mset(
      [
        ["key1", "key1:value"],
        ["key2", "key2:value"],
        ["key3", "key3:value"],
      ],
      1000,
    );
    await expect(cache.store.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(cache.store.mdel("key1", "key2", "key3")).resolves.toBeUndefined();
    await expect(cache.store.keys()).resolves.toEqual([]);
    await expect(cache.store.mget(...["key1", "key2", "key3"])).resolves.toEqual([]);
  });

  it("should hget", async () => {
    await cache.store.hset("key", "field", "value");
    await expect(cache.store.hget("key", "field")).resolves.toEqual("value");
  });

  it("should hset", async () => {
    await cache.store.hset("key", "field", "value");
    await expect(cache.store.keys()).resolves.toEqual(["key"]);
    await expect(cache.store.hkeys("key")).resolves.toEqual(["field"]);
    await expect(cache.store.hgetall("key")).resolves.toEqual({ field: "value" });
  });

  it("should hdel", async () => {
    await cache.store.hset("key", "field", "value");
    await expect(cache.store.hget("key", "field")).resolves.toEqual("value");
    await expect(cache.store.hdel("key", "field")).resolves.toBeUndefined();
    await expect(cache.store.hget("key", "field")).resolves.toBeUndefined();
  });

  it("should use shared client", async () => {
    await cache.set("key", "value");
    await expect(cache2.get("key")).resolves.toEqual("value");
  });
});
