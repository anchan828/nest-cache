import { AsyncLocalStorageStore } from "@anchan828/nest-cache-manager-async-local-storage";
import { RedisStore } from "@anchan828/nest-cache-manager-ioredis";
import { MemoryStore } from "@anchan828/nest-cache-manager-memory";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { DiscoveryModule } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { AsyncLocalStorage } from "async_hooks";
import { Cache, caching } from "cache-manager";
import { setTimeout } from "timers/promises";
import { CacheMiddlewareService } from "./cache.middleware";
import { CacheService } from "./cache.service";
import { CACHE_MODULE_OPTIONS } from "./constants";

const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

function getCacheStore(storeName: string, port?: number): Promise<Cache<any>> {
  switch (storeName) {
    case "memory(default)":
      return caching("memory", { ttl: 5, maxSize: 500, sizeCalculation: () => 1 });
    case "memory":
      return caching(
        new MemoryStore({
          ttl: 5,
          maxSize: 500,
          sizeCalculation: () => 1,
        }) as any,
      );
    case "redis":
    case "redis(dragonfly)":
    case "redis(valkey)":
      return caching(
        new RedisStore({
          ttl: 5,
          port,
          host: process.env.REDIS_HOST || "localhost",
        }),
      );
    case "async-local-storage":
      return caching(new AsyncLocalStorageStore({ asyncLocalStorage }));
  }

  throw new Error(`Not found cache store: ${storeName}`);
}

type StoreName = "memory(default)" | "memory" | "redis" | "redis(dragonfly)" | "redis(valkey)" | "async-local-storage";

describe.each([
  { storeName: "memory(default)" },
  { storeName: "memory" },
  { storeName: "redis", port: 6379 },
  { storeName: "redis(dragonfly)", port: 6380 },
  { storeName: "redis(valkey)", port: 6381 },
  { storeName: "async-local-storage" },
] as { storeName: StoreName; port?: number }[])("store: $storeName", ({ storeName, port }) => {
  let service: CacheService;
  beforeEach(async () => {
    const app = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        CacheService,
        CacheMiddlewareService,
        {
          provide: CACHE_MANAGER,
          useFactory: async () => {
            return await getCacheStore(storeName, port);
          },
        },
        {
          provide: CACHE_MODULE_OPTIONS,
          useValue: {},
        },
      ],
    }).compile();

    expect(app).toBeDefined();
    service = app.get<CacheService>(CacheService);

    asyncLocalStorage.enterWith(new Map());
  });

  afterEach(async () => {
    if (storeName.includes("redis")) {
      await service?.["cacheManager"]?.["store"]?.["store"]?.flushdb();
      await service?.["cacheManager"]?.["store"]?.close();
    }

    await new Promise<void>((resolve) => asyncLocalStorage.exit(() => resolve()));
    asyncLocalStorage.getStore()?.clear();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("get/set/delete", () => {
    it("should be defined", () => {
      expect(service.get).toBeDefined();
      expect(service.set).toBeDefined();
      expect(service.delete).toBeDefined();
    });

    it("test", async () => {
      await expect(service.get("test")).resolves.toBeUndefined();
      await service.set("test", 0);
      await expect(service.get("test")).resolves.toBe(0);
      await service.set("test", "");
      await expect(service.get("test")).resolves.toBe("");
      await service.set("test", 1);
      await expect(service.get("test")).resolves.toBe(1);
      await service.delete("test");
      await expect(service.get("test")).resolves.toBeUndefined();
    });

    it("set ttl", async () => {
      if (storeName === "async-local-storage") {
        return;
      }

      await expect(service.get("test")).resolves.toBeUndefined();
      await service.set("test", 1, 1);
      await expect(service.get("test")).resolves.toBe(1);
      await expect(service.ttl("test")).resolves.toBeGreaterThan(0);
      await setTimeout(1100);
      await expect(service.get("test")).resolves.toBeUndefined();
    });

    it("set date object", async () => {
      const date = new Date();
      await expect(service.get("test")).resolves.toBeUndefined();
      await service.set("test", { date });
      await expect(service.get("test")).resolves.toEqual({ date });
    });

    it("shouldn't set undefined value", async () => {
      await expect(service.get("test")).resolves.toBeUndefined();
      await service.set("test", undefined);
      await expect(service.get("test")).resolves.toBeUndefined();
    });

    it("shouldn't set non string key", async () => {
      await expect(service.get("test")).resolves.toBeUndefined();
      await service.set({ obj: "key" } as any, "value");
      await expect(service.get({ obj: "key" } as any)).resolves.toBeUndefined();
    });
  });

  describe("mget", () => {
    it("should get caches", async () => {
      await expect(service.mget(["key1"])).resolves.toEqual({
        key1: undefined,
      });
      await expect(service.mget(["key1", "key2"])).resolves.toEqual({
        key1: undefined,
        key2: undefined,
      });

      await service.set("key1", "value1");
      await expect(service.mget(["key1"])).resolves.toEqual({
        key1: "value1",
      });
      await expect(service.mget(["key1", "key2"])).resolves.toEqual({
        key1: "value1",
        key2: undefined,
      });
    });
  });

  describe("mset", () => {
    it("should get caches", async () => {
      await service.mset({});

      await expect(service.mget(["key1", "key2"])).resolves.toEqual({
        key1: undefined,
        key2: undefined,
      });

      await service.mset({ key1: "value1" });

      await expect(service.mget(["key1", "key2"])).resolves.toEqual({
        key1: "value1",
        key2: undefined,
      });
    });
  });

  describe("mdel", () => {
    it("should delete caches", async () => {
      await expect(service.mdel([])).resolves.toBeUndefined();
      await expect(
        service.mset({
          key1: "value1",
          key2: "value2",
        }),
      ).resolves.toBeUndefined();

      await expect(service.mget(["key1", "key2"])).resolves.toEqual({
        key1: "value1",
        key2: "value2",
      });

      await expect(service.mdel(["key1"])).resolves.toBeUndefined();

      await expect(service.mget(["key1", "key2"])).resolves.toEqual({
        key1: undefined,
        key2: "value2",
      });

      await expect(service.mdel(["key1", "key2"])).resolves.toBeUndefined();

      await expect(service.mget(["key1", "key2"])).resolves.toEqual({
        key1: undefined,
        key2: undefined,
      });
    });
  });

  if (storeName !== "memory(default)") {
    describe("hget", () => {
      it("should get cache", async () => {
        if (storeName === "memory") {
          return;
        }

        await service.hset("key", "field", "value");
        await expect(service.hget("key", "field")).resolves.toEqual("value");
      });
    });

    describe("hset", () => {
      it("should set cache", async () => {
        await service.hset("key", "field", "value");
        await expect(service.getKeys()).resolves.toEqual(["key"]);
        await expect(service.hkeys("key")).resolves.toEqual(["field"]);
        await expect(service.hgetall("key")).resolves.toEqual({ field: "value" });
      });
    });

    describe("hdel", () => {
      it("should not call hdel", async () => {
        await expect(service.hdel("key", [])).resolves.toBeUndefined();
      });

      it("should delete cache", async () => {
        await service.hset("key", "field", "value");
        await expect(service.hget("key", "field")).resolves.toEqual("value");
        await expect(service.hdel("key", ["field"])).resolves.toBeUndefined();
        await expect(service.hget("key", "field")).resolves.toBeUndefined();
      });

      it("should delete cache with array", async () => {
        await service.hset("key", "field", "value");
        await expect(service.hget("key", "field")).resolves.toEqual("value");
        await expect(service.hdel("key", ["field"])).resolves.toBeUndefined();
        await expect(service.hget("key", "field")).resolves.toBeUndefined();
      });
    });
  }
  describe("getKeys", () => {
    it("should get keys", async () => {
      await service.mset({
        "A-A": 1,
        "A-B": 1,
        "A-B-C": 1,
        "A-B-D": 1,
        "A-C-D": 1,
        "B-C": 1,
      });

      if (storeName !== "memory(default)") {
        await expect(service.getKeys("A-*")).resolves.toEqual(["A-A", "A-B", "A-B-C", "A-B-D", "A-C-D"]);
        await expect(service.getKeys("A-B-*")).resolves.toEqual(["A-B-C", "A-B-D"]);
        await expect(service.getKeys("A-*-D")).resolves.toEqual(["A-B-D", "A-C-D"]);
        await expect(service.getKeys("*-B-*")).resolves.toEqual(["A-B-C", "A-B-D"]);
        await expect(service.getKeys("B-*")).resolves.toEqual(["B-C"]);
      }
    });
  });

  describe("getEntries", () => {
    it("should get entries", async () => {
      await service.set("A", 1);
      await service.set("A-A", 1);
      await service.set("A-B", 1);

      await expect(service.getEntries()).resolves.toEqual([
        { key: "A", value: 1 },
        { key: "A-A", value: 1 },
        { key: "A-B", value: 1 },
      ]);

      if (storeName === "memory(default)") {
        // The default memory store retrieves all keys.
        await expect(service.getEntries("A-*")).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "A-A", value: 1 },
          { key: "A-B", value: 1 },
        ]);
      } else {
        await expect(service.getEntries("A-*")).resolves.toEqual([
          { key: "A-A", value: 1 },
          { key: "A-B", value: 1 },
        ]);
      }
    });
  });
});
