import { AsyncLocalStorageService } from "@anchan828/nest-cache-common";
import { AsyncLocalStorage } from "async_hooks";
import Redis from "ioredis";
import { pack, unpack } from "msgpackr";
import { RedisStore, redisStore } from "./store";
describe.each([
  { name: "ioredis", client: new Redis({ db: 1, port: 6379, host: process.env.REDIS_HOST || "localhost" }) },
  {
    name: "ioredis-mock",
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    client: new (require("ioredis-mock"))(),
  },
  { name: "dragonfly", client: new Redis({ db: 1, port: 6380, host: process.env.REDIS_HOST || "localhost" }) },
  { name: "valkey", client: new Redis({ db: 1, port: 6381, host: process.env.REDIS_HOST || "localhost" }) },
])("RedisStore: $name", ({ client }) => {
  let asyncLocalStorage: AsyncLocalStorage<Map<string, any>>;
  let asyncLocalStorageService: AsyncLocalStorageService;
  let cache: RedisStore;
  let cache2: RedisStore;

  beforeEach(async () => {
    asyncLocalStorage = new AsyncLocalStorage();

    cache = redisStore({ client, asyncLocalStorage, ttl: 5 });

    cache2 = redisStore({ asyncLocalStorage, client: cache["store"], ttl: 10 });

    asyncLocalStorageService = cache["asyncLocalStorage"];

    if (client.status === "end") {
      await client.connect();
    }
  });

  afterEach(async () => {
    await client.flushdb();
  });

  afterAll(async () => {
    await cache.close();
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

      await expect(cache["store"].getBuffer(key)).resolves.toEqual(
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
      const buf = await cache["store"].getBuffer(key);
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
  it("should no set undefined", async () => {
    await cache.set("key", undefined);
    await cache.set(undefined as any, "value");
  });

  it("should no set value when ttl is 0", async () => {
    await cache.set("test", "value", 0);
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
    cache["asyncLocalStorage"].delete(key);
    await expect(cache.get(key)).resolves.toEqual([1, "2", true]);
  });

  it("should set ttl", async () => {
    const key = "test";
    await cache.set(key, { id: 1 }, 10);
    await expect(cache["store"].ttl(key)).resolves.toBeGreaterThan(5);
  });

  it("should set ttl: -1", async () => {
    const key = "test";
    await cache.set(key, { id: 1 }, -1);
    await expect(cache["store"].ttl(key)).resolves.toEqual(-1);
  });

  it("should get 0 when undefined key", async () => {
    await expect(cache.ttl(undefined as any)).resolves.toEqual(0);
  });

  it("should get ttl", async () => {
    const key = "test";
    await cache.set(key, key);
    await expect(cache.ttl(key)).resolves.toBeGreaterThanOrEqual(4);
  });

  it("should not try to get value when key is not string", async () => {
    await expect(cache.get({} as any)).resolves.toBeUndefined();
  });

  it("should not delete undefined key", async () => {
    await expect(cache.del(undefined as any)).resolves.toBeUndefined();
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

    const results = await cache.keys();

    expect(results.sort()).toEqual(["key1", "key2", "key3"]);
  });

  it("should reset cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await cache.set(key, key);
    }
    let results = await cache.keys();
    expect(results.sort()).toEqual(["key1", "key2", "key3"]);
    await cache.reset();
    results = await cache.keys();
    expect(results.sort()).toEqual([]);
  });

  it("should change key prefix", async () => {
    const cache = redisStore({ host: process.env.REDIS_HOST || "localhost", ttl: 10, db: 3, keyPrefix: "changed:" });
    const key = "key";
    await cache.set(key, key);
    const results = await cache.keys();
    expect(results.sort()).toEqual(["changed:key"]);

    const redis = cache["store"];
    await redis.quit();
  });

  it("should mget", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      for (const key of ["key1", "key2", "key4"]) {
        await cache.set(key, `${key}:value`);
      }

      await expect(cache.mget(...["key1", "key2", "key3", "key4"])).resolves.toEqual([
        "key1:value",
        "key2:value",
        undefined,
        "key4:value",
      ]);
    });
  });

  it("should mset", async () => {
    await cache.mset([
      ["key1", "key1:value"],
      ["key2", "key2:value"],
      ["key3", "key3:value"],
    ]);
    await expect(cache.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(cache.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should mset with ttl", async () => {
    await cache.mset(
      [
        ["key1", "key1:value"],
        ["key2", "key2:value"],
        ["key3", "key3:value"],
      ],
      1000,
    );
    await expect(cache.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(cache.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should not mset when undefined", async () => {
    await cache.mset(
      [
        [undefined as any, "key1:value"],
        ["key2", undefined],
        ["key3", "key3:value"],
      ],
      1000,
    );
    await expect(cache.keys()).resolves.toEqual(["key3"]);
    await expect(cache.mget(...["key1", "key2", "key3"])).resolves.toEqual([undefined, undefined, "key3:value"]);
  });

  it("should not mset when ttl is 0", async () => {
    await cache.mset(
      [
        ["key1", "key1:value"],
        ["key2", "key2:value"],
        ["key3", "key3:value"],
      ],
      0,
    );
    await expect(cache.keys()).resolves.toEqual([]);
    await expect(cache.mget(...["key1", "key2", "key3"])).resolves.toEqual([undefined, undefined, undefined]);
  });

  it("should mset when ttl is -1", async () => {
    await cache.mset(
      [
        ["key1", "key1:value"],
        ["key2", "key2:value"],
        ["key3", "key3:value"],
      ],
      -1,
    );
    await expect(cache.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(cache.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should mdel", async () => {
    await cache.mset(
      [
        ["key1", "key1:value"],
        ["key2", "key2:value"],
        ["key3", "key3:value"],
      ],
      1000,
    );
    await expect(cache.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(cache.mdel("key1", "key2", "key3")).resolves.toBeUndefined();
    await expect(cache.keys()).resolves.toEqual([]);
    await expect(cache.mget(...["key1", "key2", "key3"])).resolves.toEqual([]);
  });

  it("should hget", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.hset("key", "field", "value");
      await expect(cache.hget("key", "field")).resolves.toEqual("value");
      await expect(cache.hget("key", "field2")).resolves.toBeUndefined();
    });
  });

  it("should not hget when undefined", async () => {
    await cache.hget("key", undefined as any);
    await cache.hget(undefined as any, "field");
  });

  it("should hset", async () => {
    await cache.hset("key", "field", "value");
    await expect(cache.keys()).resolves.toEqual(["key"]);
    await expect(cache.hkeys("key")).resolves.toEqual(["field"]);
    await expect(cache.hgetall("key")).resolves.toEqual({ field: "value" });
  });

  it("should not hset when undefined", async () => {
    await expect(cache.hset("key", "field", undefined)).resolves.toBeUndefined();
    await expect(cache.hset("key", undefined as any, "value")).resolves.toBeUndefined();
    await expect(cache.hset(undefined as any, "field", "value")).resolves.toBeUndefined();
  });

  it("should hdel", async () => {
    await cache.hset("key", "field", "value");
    await expect(cache.hget("key", "field")).resolves.toEqual("value");
    await expect(cache.hdel("key", "field")).resolves.toBeUndefined();
    await expect(cache.hget("key", "field")).resolves.toBeUndefined();
  });

  it("should not hdel when undefined", async () => {
    await expect(cache.hdel("key", "field")).resolves.toBeUndefined();
    await expect(cache.hdel("key", undefined as any)).resolves.toBeUndefined();
    await expect(cache.hdel(undefined as any, ...["field", undefined as any])).resolves.toBeUndefined();
  });

  it("should hgetall", async () => {
    await expect(cache.hgetall("key")).resolves.toEqual({});
    await expect(cache.hgetall(undefined as any)).resolves.toEqual({});
  });

  it("should hkeys", async () => {
    await expect(cache.hkeys(undefined as any)).resolves.toEqual([]);
  });
  it("should use shared client", async () => {
    await cache.set("key", "value");
    await expect(cache2.get("key")).resolves.toEqual("value");
  });

  it("should clear asyncLocalStorage", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.set("key", "value");
      expect(cache["asyncLocalStorage"].get("key")).toEqual("value");
      cache["asyncLocalStorage"].clear();
      expect(cache["asyncLocalStorage"].get("key")).toBeUndefined();
    });
  });
});
