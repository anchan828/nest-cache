import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { ConfigModule, registerAs } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { CacheModuleOptions, CacheModuleOptionsFactory } from "./cache.interface";
import { CacheModule } from "./cache.module";
import { CacheService } from "./cache.service";
import { CACHE_MODULE_OPTIONS } from "./constants";
describe("CacheModule", () => {
  describe("register", () => {
    it("should compile (single cache)", async () => {
      await expect(
        Test.createTestingModule({
          imports: [CacheModule.register({})],
        }).compile(),
      ).resolves.toBeDefined();
    });

    it("should compile (multiple cache)", async () => {
      await expect(
        Test.createTestingModule({
          imports: [CacheModule.register([{}, {}])],
        }).compile(),
      ).resolves.toBeDefined();
    });
  });

  describe("registerAsync", () => {
    it("should compile", async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            CacheModule.registerAsync({
              useFactory: () => {
                return {};
              },
            }),
          ],
        }).compile(),
      ).resolves.toBeDefined();
    });
  });

  describe("get providers", () => {
    let app: TestingModule;
    beforeEach(async () => {
      app = await Test.createTestingModule({
        imports: [
          CacheModule.registerAsync({
            useFactory: () => ({
              ttl: 100,
            }),
          }),
        ],
      }).compile();
    });

    it("should get cache manager", () => {
      expect(app.get(CACHE_MANAGER)).toBeDefined();
    });

    it("should get CacheService", () => {
      expect(app.get(CacheService)).toBeDefined();
    });
  });

  describe("use config", () => {
    it("should compile", async () => {
      const config = registerAs("abc", () => ({ version: "version" }));

      @Injectable()
      class Options implements CacheModuleOptionsFactory {
        constructor(@Inject(config.KEY) private readonly conf: { version: string }) {}

        createCacheOptions(): CacheModuleOptions | Promise<CacheModuleOptions> {
          return {
            cacheVersion: this.conf.version,
          };
        }
      }

      @Injectable()
      class Service {
        constructor(@Inject(CACHE_MODULE_OPTIONS) private options: CacheModuleOptions) {}

        public getOptions() {
          return this.options;
        }
      }

      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          CacheModule.registerAsync({
            imports: [ConfigModule.forFeature(config)],
            inject: [config.KEY],
            useClass: Options,
          }),
        ],
        providers: [Service],
      }).compile();
      expect(moduleRef).toBeDefined();
      expect(moduleRef.get(Service).getOptions()).toEqual({ cacheVersion: "version" });
    });
  });

  describe("use pubsub", () => {
    it("should compile", async () => {
      const module = await Test.createTestingModule({
        imports: [CacheModule.register({ pubsub: { host: "localhost" } })],
      }).compile();

      const app = await module.init();
      expect(app).toBeDefined();
      await app.close();
    });
  });

  describe("use multiCaching", () => {
    it("should compile", async () => {
      const module = await Test.createTestingModule({
        imports: [CacheModule.register([{ ttl: 10 }, { pubsub: { host: "localhost" } }])],
      }).compile();

      const app = await module.init();
      expect(app).toBeDefined();
      await app.close();
    });
  });
});
