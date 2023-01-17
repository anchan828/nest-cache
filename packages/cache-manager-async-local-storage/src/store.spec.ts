import { AsyncLocalStorage } from "async_hooks";
import { AsyncLocalStorageStore, asyncLocalStorageStore } from "./store";
describe("AsyncLocalStorageStore", () => {
  let asyncLocalStorage: AsyncLocalStorage<Map<string, any>>;
  let cache: AsyncLocalStorageStore;
  let ttl0Cache: AsyncLocalStorageStore;
  beforeEach(async () => {
    asyncLocalStorage = new AsyncLocalStorage();
    cache = asyncLocalStorageStore({ asyncLocalStorage });
    ttl0Cache = asyncLocalStorageStore({ asyncLocalStorage, ttl: 0 });
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
      await expect(cache.get(key)).resolves.toBeUndefined();

      const value = {
        id: 1,
        name: "Name",
        nest: {
          id: 10,
        },
        date: new Date(),
      };

      await cache.set(key, value, 0);

      await expect(cache.get(key)).resolves.toBeUndefined();

      await ttl0Cache.set(key, value);

      await expect(ttl0Cache.get(key)).resolves.toBeUndefined();

      await cache.set(key, value);

      expect(Array.from(cache["store"].getStore()?.keys() || [])).toEqual(["nest-cache:test"]);

      await expect(cache.get(key)).resolves.toEqual(value);

      expect(Array.from(cache["store"].getStore()?.keys() || [])).toEqual(["nest-cache:test"]);
    });
    expect(Array.from(cache["store"].getStore()?.keys() || [])).toEqual([]);
  });
  it("should no set undefined", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.set("key", undefined);
      await cache.set(undefined as any, "value");
    });
  });

  it("should no set value when ttl is 0", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.set("test", "value", 0);
    });
  });

  it("should set array", async () => {
    const key = "test";
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.set(key, [1, "2", true]);
      await expect(cache.get(key)).resolves.toEqual([1, "2", true]);
    });
  });

  it("should get 0 when undefined key", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await expect(cache.ttl(undefined as any)).resolves.toEqual(0);
    });
  });

  it("should always return -1", async () => {
    const key = "test";
    await asyncLocalStorage.run(new Map(), async () => {
      await expect(cache.ttl(key)).resolves.toBeGreaterThanOrEqual(-1);
    });
  });

  it("should not try to get value when key is not string", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await expect(cache.get({} as any)).resolves.toBeUndefined();
    });
  });

  it("should not delete undefined key", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await expect(cache.del(undefined as any)).resolves.toBeUndefined();
    });
  });

  it("should delete cache", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      const key = "test";
      await asyncLocalStorage.run(new Map(), async () => {
        await cache.set(key, key);
        await expect(cache.get(key)).resolves.toEqual(key);
        await expect(cache.del(key)).resolves.toBeUndefined();
        await expect(cache.get(key)).resolves.toBeUndefined();
      });
    });
  });

  it("should get cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    await asyncLocalStorage.run(new Map(), async () => {
      for (const key of keys) {
        await cache.set(key, key);
      }

      const results = await cache.keys();

      expect(results.sort()).toEqual(["key1", "key2", "key3"]);
    });
  });

  it("should reset cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    await asyncLocalStorage.run(new Map(), async () => {
      for (const key of keys) {
        await cache.set(key, key);
      }
      let results = await cache.keys();
      expect(results.sort()).toEqual(["key1", "key2", "key3"]);
      await cache.reset();
      results = await cache.keys();
      expect(results.sort()).toEqual([]);
    });
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
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.mset(
        [
          ["key1", "key1:value"],
          ["key2", "key2:value"],
          ["key3", "key3:value"],
        ],
        0,
      );
      await expect(cache.keys()).resolves.toEqual([]);

      await ttl0Cache.mset([
        ["key1", "key1:value"],
        ["key2", "key2:value"],
        ["key3", "key3:value"],
      ]);
      await expect(ttl0Cache.keys()).resolves.toEqual([]);

      await cache.mset([
        ["key1", "key1:value"],
        ["key2", "key2:value"],
        ["key3", "key3:value"],
      ]);

      await expect(cache.keys()).resolves.toEqual(["key1", "key2", "key3"]);
      await expect(cache.mget(...["key1", "key2", "key3"])).resolves.toEqual([
        "key1:value",
        "key2:value",
        "key3:value",
      ]);
    });
  });

  it("should not mset when undefined", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.mset([
        [undefined as any, "key1:value"],
        ["key2", undefined],
        ["key3", "key3:value"],
      ]);
      await expect(cache.keys()).resolves.toEqual(["key3"]);
      await expect(cache.mget(...["key1", "key2", "key3"])).resolves.toEqual([undefined, undefined, "key3:value"]);
    });
  });

  it("should not mset when ttl is 0", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
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
  });

  it("should mdel", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
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
  });

  it("should hget", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.hset("key", "field", "value");
      await expect(cache.hget("key", "field")).resolves.toEqual("value");
      await expect(cache.hget("key", "field2")).resolves.toBeUndefined();
    });
  });

  it("should not hget when undefined", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.hget("key", undefined as any);
      await cache.hget(undefined as any, "field");
    });
  });

  it("should hset", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.hset("key", "field", "value");
      await expect(cache.keys()).resolves.toEqual(["key"]);
      await expect(cache.hkeys("key")).resolves.toEqual(["field"]);
      await expect(cache.hgetall("key")).resolves.toEqual({ field: "value" });
    });
  });

  it("should not hset when undefined", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await expect(cache.hset("key", "field", undefined)).resolves.toBeUndefined();
      await expect(cache.hset("key", undefined as any, "value")).resolves.toBeUndefined();
      await expect(cache.hset(undefined as any, "field", "value")).resolves.toBeUndefined();
    });
  });

  it("should hdel", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await cache.hset("key", "field", "value");
      await expect(cache.hget("key", "field")).resolves.toEqual("value");
      await expect(cache.hdel("key", "field")).resolves.toBeUndefined();
      await expect(cache.hget("key", "field")).resolves.toBeUndefined();
    });
  });

  it("should not hdel when undefined", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await expect(cache.hdel("key", "field")).resolves.toBeUndefined();
      await expect(cache.hdel("key", undefined as any)).resolves.toBeUndefined();
      await expect(cache.hdel(undefined as any, ...["field", undefined as any])).resolves.toBeUndefined();
    });
  });

  it("should hgetall", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await expect(cache.hgetall("key")).resolves.toEqual({});
      await expect(cache.hgetall(undefined as any)).resolves.toEqual({});
    });
  });

  it("should hkeys", async () => {
    await asyncLocalStorage.run(new Map(), async () => {
      await expect(cache.hkeys(undefined as any)).resolves.toEqual([]);
    });
  });
});
