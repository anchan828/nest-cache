import { setTimeout } from "timers/promises";
import { memoryStore, MemoryStore } from "./store";

jest.retryTimes(3);

describe("MemoryStore", () => {
  let cache: MemoryStore;
  beforeEach(async () => {
    cache = memoryStore({ ttl: 5 });
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

  it("should get ttl", async () => {
    const key = "test";
    await cache.set(key, key);
    await expect(cache.ttl(key)).resolves.toBeGreaterThanOrEqual(4);
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

    const results = await cache.keys();

    expect(results.sort()).toEqual(["key1", "key2", "key3"]);

    await expect(cache.keys("key1")).resolves.toEqual(["key1"]);
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

  it("should mget", async () => {
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

  it("should mset", async () => {
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
    await expect(cache.mdel(...["key1", "key2", "key3"])).resolves.toBeUndefined();
    await expect(cache.keys()).resolves.toEqual([]);
  });

  it("should hget", async () => {
    await expect(cache.hget("key", "field")).resolves.toBeUndefined();
    await cache.set("key", "value");
    await expect(cache.hget("key", "field")).resolves.toBeUndefined();

    await cache.hset("key", "field", "value");
    await expect(cache.hget("key", "field")).resolves.toEqual("value");
  });

  it("should hset", async () => {
    await cache.hset("key", "field", "value");
    await expect(cache.keys()).resolves.toEqual(["key"]);
    await expect(cache.hkeys("key")).resolves.toEqual(["field"]);
    await expect(cache.hgetall("key")).resolves.toEqual({ field: "value" });
  });

  it("should hdel", async () => {
    await expect(cache.hdel("key", "field")).resolves.toBeUndefined();

    await cache.hset("key", "field", "value");
    await expect(cache.hget("key", "field")).resolves.toEqual("value");
    await expect(cache.hdel("key", "field")).resolves.toBeUndefined();
    await expect(cache.hget("key", "field")).resolves.toBeUndefined();
  });
  it("should hgetall", async () => {
    await expect(cache.hgetall(undefined as any)).resolves.toEqual({});
    await expect(cache.hgetall("key")).resolves.toEqual({});
    await cache.hset("key", "field", "value");
    await expect(cache.hgetall("key")).resolves.toEqual({ field: "value" });
  });
  it("should hkeys", async () => {
    await expect(cache.hkeys("key")).resolves.toEqual([]);
    await cache.hset("key", "field", "value");
    await expect(cache.hkeys("key")).resolves.toEqual(["field"]);
  });

  it("should call reset", async () => {
    await cache.set("key", "value");
    await expect(cache.keys()).resolves.toEqual(["key"]);
    await expect(cache.close()).resolves.toBeUndefined();
    await expect(cache.keys()).resolves.toEqual([]);
  });
});
