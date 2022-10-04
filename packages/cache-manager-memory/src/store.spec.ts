import { patchMoreCommands } from "@anchan828/nest-cache-common";
import { Cache, caching } from "cache-manager";
import { setTimeout } from "timers/promises";
import { MemoryStore } from "./store";

describe("MemoryStore", () => {
  let cache: Cache<MemoryStore>;
  beforeEach(async () => {
    cache = await caching(new MemoryStore({ ttl: 5 }));
    patchMoreCommands(cache);
  });

  it("create cache instance", () => {
    expect(cache).toBeDefined();
  });

  it("should set cache", async () => {
    const key = "test";
    await expect(cache.get(key)).resolves.toBeUndefined();

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

  it("should set ttl", async () => {
    const key = "test";
    await cache.set(key, { id: 1 }, 1);

    await expect(cache.get(key)).resolves.toEqual({ id: 1 });
    await setTimeout(2000);
    await expect(cache.get(key)).resolves.toBeUndefined();
  });

  it("should set ttl: -1", async () => {
    const key = "test";
    await cache.set(key, { id: 1 }, -1);
    await expect(cache.get(key)).resolves.toBeUndefined();
  });

  it("should delete cache", async () => {
    const key = "test";
    await cache.set(key, key);
    await expect(cache.del(key)).resolves.toBeUndefined();
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
});
