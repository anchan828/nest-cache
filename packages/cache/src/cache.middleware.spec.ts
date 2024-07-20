import { CacheManager } from "@anchan828/nest-cache-common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Provider } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CacheContext, CacheMiddleware, ICacheMiddleware } from "./cache.middleware";
import { CacheModule } from "./cache.module";
import { CacheService } from "./cache.service";
describe("CacheMiddleware", () => {
  async function createTestingModule(providers: Provider[]) {
    return Test.createTestingModule({
      imports: [CacheModule.register({})],
      providers,
    })
      .compile()
      .then((app) => app.init());
  }

  describe("priority", () => {
    it("should be called in order of priority", async () => {
      const mock = jest.fn();

      @CacheMiddleware({ priority: 2 })
      class TestCacheMiddleware1 implements ICacheMiddleware {
        async ttl(context: CacheContext<"ttl">): Promise<void> {
          mock(context, "priority 2");
        }
      }

      @CacheMiddleware({ priority: 1 })
      class TestCacheMiddleware2 implements ICacheMiddleware {
        async ttl(context: CacheContext<"ttl">): Promise<void> {
          mock(context, "priority 1");
        }
      }

      const app = await createTestingModule([TestCacheMiddleware1, TestCacheMiddleware2]);

      await app.get(CacheService).ttl("test");

      expect(mock.mock.calls).toEqual([
        [
          {
            key: "test",
            getSource: expect.any(Function),
          },
          "priority 1",
        ],
        [
          {
            key: "test",
            getSource: expect.any(Function),
          },
          "priority 2",
        ],
      ]);
    });
  });

  it("call all types", async () => {
    const fn = jest.fn();

    @CacheMiddleware()
    class TestCacheMiddleware implements ICacheMiddleware {
      async ttl(context: CacheContext<"ttl">): Promise<void> {
        fn("ttl", context);
      }

      async get(context: CacheContext<"get">): Promise<void> {
        fn("get", context);
      }

      async set(context: CacheContext<"set">): Promise<void> {
        fn("set", context);
      }

      async delete(context: CacheContext<"delete">): Promise<void> {
        fn("delete", context);
      }

      async mget(context: CacheContext<"mget">): Promise<void> {
        fn("mget", context);
      }

      async mset(context: CacheContext<"mset">): Promise<void> {
        fn("mset", context);
      }

      async mdel(context: CacheContext<"mdel">): Promise<void> {
        fn("mdel", context);
      }

      async hget(context: CacheContext<"hget">): Promise<void> {
        fn("hget", context);
      }

      async hset(context: CacheContext<"hset">): Promise<void> {
        fn("hset", context);
      }

      async hdel(context: CacheContext<"hdel">): Promise<void> {
        fn("hdel", context);
      }

      async hgetall(context: CacheContext<"hgetall">): Promise<void> {
        fn("hgetall", context);
      }

      async hkeys(context: CacheContext<"hkeys">): Promise<void> {
        fn("hkeys", context);
      }
    }

    const app = await createTestingModule([TestCacheMiddleware]);
    const cache = app.get(CacheService);
    await cache.ttl("test");
    await cache.get("test");
    await cache.set("test", "value");
    await cache.delete("test");
    await cache.mget(["test"]);
    await cache.mset({ test: "value" });
    await cache.mdel(["test"]);
    await cache.hget("test", "field");
    await cache.hset("test", "field", "value");
    await cache.hdel("test", ["field"]);
    await cache.hgetall("test");
    await cache.hkeys("test");

    expect(fn.mock.calls).toEqual([
      ["ttl", { key: "test", getSource: expect.any(Function) }],
      ["get", { key: "test", getSource: expect.any(Function) }],
      ["set", { key: "test", value: "value", getSource: expect.any(Function) }],
      ["delete", { key: "test", getSource: expect.any(Function) }],
      ["mget", { keys: ["test"], getSource: expect.any(Function) }],
      ["mset", { record: { test: "value" }, getSource: expect.any(Function) }],
      ["mdel", { keys: ["test"], getSource: expect.any(Function) }],
      ["hget", { key: "test", field: "field", getSource: expect.any(Function) }],
      ["hset", { key: "test", field: "field", value: "value", getSource: expect.any(Function) }],
      ["hdel", { key: "test", fields: ["field"], getSource: expect.any(Function) }],
      ["hgetall", { key: "test", getSource: expect.any(Function) }],
      ["hkeys", { key: "test", getSource: expect.any(Function) }],
    ]);

    await app.close();
  });

  it("should override context", async () => {
    @CacheMiddleware()
    class TestCacheMiddleware implements ICacheMiddleware {
      async ttl(context: CacheContext<"ttl">): Promise<void> {
        context.key = "test2";
      }

      async get(context: CacheContext<"get">): Promise<void> {
        context.key = "test2";
      }

      async set(context: CacheContext<"set">): Promise<void> {
        context.key = "test2";
        context.value = "value2";
        context.ttl = 10;
      }

      async delete(context: CacheContext<"delete">): Promise<void> {
        context.key = "test2";
      }

      async mget(context: CacheContext<"mget">): Promise<void> {
        context.keys = ["test2"];
      }

      async mset(context: CacheContext<"mset">): Promise<void> {
        context.record = { test2: "value2" };
        context.ttl = 10;
      }

      async mdel(context: CacheContext<"mdel">): Promise<void> {
        context.keys = ["test2"];
      }

      async hget(context: CacheContext<"hget">): Promise<void> {
        context.key = "test2";
        context.field = "field2";
      }

      async hset(context: CacheContext<"hset">): Promise<void> {
        context.key = "test2";
        context.field = "field2";
        context.value = "value2";
      }

      async hdel(context: CacheContext<"hdel">): Promise<void> {
        context.key = "test2";
        context.fields = ["field2"];
      }

      async hgetall(context: CacheContext<"hgetall">): Promise<void> {
        context.key = "test2";
      }

      async hkeys(context: CacheContext<"hkeys">): Promise<void> {
        context.key = "test2";
      }
    }

    const app = await createTestingModule([TestCacheMiddleware]);
    const cache = app.get(CacheService);
    const manager = app.get<CacheManager>(CACHE_MANAGER);
    const ttlSpy = jest.spyOn(manager, "ttl");
    const getSpy = jest.spyOn(manager, "get");
    const setSpy = jest.spyOn(manager, "set");
    const delSpy = jest.spyOn(manager, "del");
    const mgetSpy = jest.spyOn(manager, "mget");
    const msetSpy = jest.spyOn(manager, "mset");
    const mdelSpy = jest.spyOn(manager, "mdel");
    const hgetSpy = jest.spyOn(manager, "hget");
    const hsetSpy = jest.spyOn(manager, "hset");
    const hdelSpy = jest.spyOn(manager, "hdel");
    const hgetallSpy = jest.spyOn(manager, "hgetall");
    const hkeysSpy = jest.spyOn(manager, "hkeys");

    await cache.ttl("test");
    await cache.get("test");
    await cache.set("test", "value");
    await cache.delete("test");
    await cache.mget(["test"]);
    await cache.mset({ test: "value" });
    await cache.mdel(["test"]);
    await cache.hget("test", "field");
    await cache.hset("test", "field", "value");
    await cache.hdel("test", ["field"]);
    await cache.hgetall("test");
    await cache.hkeys("test");

    expect(ttlSpy.mock.calls).toEqual([["test2"]]);
    expect(getSpy.mock.calls).toEqual([["test2"]]);
    expect(setSpy.mock.calls).toEqual([["test2", "value2", 10]]);
    expect(delSpy.mock.calls).toEqual([["test2"]]);
    expect(mgetSpy.mock.calls).toEqual([["test2"]]);
    expect(msetSpy.mock.calls).toEqual([[[["test2", "value2"]], 10]]);
    expect(mdelSpy.mock.calls).toEqual([["test2"]]);
    expect(hgetSpy.mock.calls).toEqual([["test2", "field2"]]);
    expect(hsetSpy.mock.calls).toEqual([["test2", "field2", "value2"]]);
    expect(hdelSpy.mock.calls).toEqual([["test2", "field2"]]);
    expect(hgetallSpy.mock.calls).toEqual([["test2"]]);
    expect(hkeysSpy.mock.calls).toEqual([["test2"]]);
  });
});
