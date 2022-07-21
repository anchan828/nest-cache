import { CacheManager, patchMoreCommands } from "@anchan828/nest-cache-common";
import { caching } from "cache-manager";
import { setTimeout } from "timers/promises";
import { memoryStore } from "./store";

describe("MemoryStore", () => {
  let store: CacheManager;
  beforeEach(async () => {
    store = caching({
      store: memoryStore,
      ttl: 5,
    } as any) as any as CacheManager;
    patchMoreCommands(store);
  });

  it("create cache instance", () => {
    expect(store).toBeDefined();
  });

  it("should set cache", async () => {
    const key = "test";
    await expect(store.get(key)).resolves.toBeUndefined();

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

  it("should set ttl", async () => {
    const key = "test";
    await store.set(key, { id: 1 }, { ttl: 1 });

    await expect(store.get(key)).resolves.toEqual({ id: 1 });
    await setTimeout(2000);
    await expect(store.get(key)).resolves.toBeUndefined();
  });

  it("should set ttl: -1", async () => {
    const key = "test";
    await store.set(key, { id: 1 }, { ttl: -1 });
    await expect(store.get(key)).resolves.toBeUndefined();
  });

  it("should delete cache", async () => {
    const key = "test";
    await store.set(key, key);
    await expect(store.del(key)).resolves.toBeUndefined();
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
