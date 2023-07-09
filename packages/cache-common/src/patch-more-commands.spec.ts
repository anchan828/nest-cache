import { patchMoreCommands } from "./patch-more-commands";

describe("patchMoreCommands", () => {
  it("should return undefined immediately when no cacheManager object", () => {
    const obj = {};
    patchMoreCommands(obj);
    expect(obj).toEqual({});
  });

  it("should bind functions", async () => {
    const cacheManager = { store: { get: () => Promise.resolve() } };
    patchMoreCommands(cacheManager);
    expect(cacheManager).toEqual({
      del: expect.any(Function),
      get: expect.any(Function),
      hdel: expect.any(Function),
      hget: expect.any(Function),
      hgetall: expect.any(Function),
      hkeys: expect.any(Function),
      hset: expect.any(Function),
      keys: expect.any(Function),
      mdel: expect.any(Function),
      mget: expect.any(Function),
      mset: expect.any(Function),
      set: expect.any(Function),
      store: {
        get: expect.any(Function),
      },
      ttl: expect.any(Function),
    });

    for (const key of Object.keys(cacheManager)) {
      if (key === "store") {
        continue;
      }
      await (cacheManager as any)[key]();
    }
  });
});
