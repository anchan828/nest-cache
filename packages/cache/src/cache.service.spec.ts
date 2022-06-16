import { redisStore } from "@anchan828/nest-cache-manager-ioredis";
import { CACHE_MANAGER } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { caching } from "cache-manager";
import { setTimeout } from "timers/promises";
import { CacheService } from "./cache.service";
import { CACHE_MODULE_OPTIONS } from "./constants";

describe.each([
  { storeName: "memory" },
  { storeName: "redis", port: 6379 },
  { storeName: "redis(dragonfly)", port: 6380 },
])("store: $storeName", ({ storeName, port }) => {
  describe.each(["", "v1", "next", "dev"])("CacheService version: %s", (version: string) => {
    let service: CacheService;
    beforeEach(async () => {
      const app = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: CACHE_MANAGER,
            useValue:
              storeName === "memory"
                ? caching({
                    store: "memory",
                    ttl: 5,
                    maxSize: 500,
                    sizeCalculation: () => 1,
                  })
                : caching({
                    store: redisStore,
                    port,
                    host: process.env.REDIS_HOST || "localhost",
                    ttl: 5,
                  } as any),
          },
          {
            provide: CACHE_MODULE_OPTIONS,
            useValue: { version },
          },
        ],
      }).compile();

      expect(app).toBeDefined();
      service = app.get<CacheService>(CacheService);
    });

    afterEach(async () => {
      if (storeName.includes("redis")) {
        await service?.["cacheManager"]?.["store"]?.["redisCache"]?.flushdb();
        await service?.["cacheManager"]?.["store"]?.close();
      }
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
        await service.delete();
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
        await expect(service.get("test")).resolves.toBeUndefined();
        await service.set("test", 1, 1);
        await expect(service.get("test")).resolves.toBe(1);
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
        await expect(service.mget([])).resolves.toEqual({});

        await expect(service.mget(["key1", "key2"])).resolves.toEqual({
          key1: undefined,
          key2: undefined,
        });

        await service.set("key1", "value1");

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

        await expect(service.getKeys("A-*")).resolves.toEqual(["A-A", "A-B", "A-B-C", "A-B-D", "A-C-D"]);
        await expect(service.getKeys("A-B-*")).resolves.toEqual(["A-B-C", "A-B-D"]);
        await expect(service.getKeys("A-*-D")).resolves.toEqual(["A-B-D", "A-C-D"]);
        await expect(service.getKeys("*-B-*")).resolves.toEqual(["A-B-C", "A-B-D"]);
        await expect(service.getKeys("B-*")).resolves.toEqual(["B-C"]);
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

        await expect(service.getEntries("A-*")).resolves.toEqual([
          { key: "A-A", value: 1 },
          { key: "A-B", value: 1 },
        ]);
      });
    });
  });
});
