import "reflect-metadata";
import supertest from 'supertest'
import path from 'path'
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../dist/.env") });

import { inject, injectable } from "inversify";

import { Cache, IOC_TYPES, ServerConfig, LoggerConfig, Logger, AppRouter, IHttpServer, HttpServer, AppRouterTest, IAppModule, AppError, errorSererity, PgConfig, PgPoolConfig, IocContainer, RedisConfig, ICacheClient, createRedisClient } from '../src'
import { Router } from "express";
import { Pool } from "pg";


@injectable()
export class TestRouter extends AppRouter {
    constructor(
        @inject(IOC_TYPES.ServerConfig) readonly serverConfig: ServerConfig,
        @inject(IOC_TYPES.Logger) readonly logger: Logger,
        @inject(IOC_TYPES.AccessTokenCache) readonly accessTokenCache: Cache
    ) {
        super(serverConfig, logger, accessTokenCache);
    }

    setup(): Router {

        this.router.use(this.setNoCacheMiddleware);

        this.router.post("/", this.getAccessTokenObjFromCacheMiddleware, this.requireAccessTokenObjMiddleware, (req, res) => res.json({ isSuccess: true }));

        return this.router;

    }
}


@injectable()
export class TestHttpServer extends HttpServer {

    constructor(
        @inject(IOC_TYPES.ServerConfig) readonly serverConfig: ServerConfig,
        @inject(IOC_TYPES.LoggerConfig) readonly loggerConfig: LoggerConfig,
        @inject(IOC_TYPES.Logger) readonly logger: Logger,
        @inject(IOC_TYPES.AccessTokenCache) readonly accessTokenCache: Cache,
        @inject("TestRouter") readonly testRouter: TestRouter,
    ) {

        super(serverConfig, loggerConfig, logger, accessTokenCache);

    }

    async configure(): Promise<IHttpServer> {

        this.app.use("/", this.testRouter.setup());

        return this;
    }

}


export class TestModule implements IAppModule {

    container = new IocContainer();

    protected useConfig() {
        this.container.bind<ServerConfig>(IOC_TYPES.ServerConfig).to(ServerConfig);
        this.container.bind<LoggerConfig>(IOC_TYPES.LoggerConfig).to(LoggerConfig);
        this.container.bind<RedisConfig>(IOC_TYPES.RedisConfig).to(RedisConfig);
        return this;
    }

    protected useLogger(useFake?: boolean) {
        this.container.bind<Logger>(IOC_TYPES.Logger).to(Logger);
        return this;
    }

    protected useRedisClient(useFake?: boolean) {
        this.container.bind<ICacheClient>(IOC_TYPES.DefaultRedisClient).toConstantValue(createRedisClient());
        return this;
    }

    protected useCache() {
        let redisConfig = this.container.get<RedisConfig>(IOC_TYPES.RedisConfig);
        let defaultRedisClient = this.container.get<ICacheClient>(IOC_TYPES.DefaultRedisClient);
        this.container.bind<Cache>(IOC_TYPES.AccessTokenCache).toConstantValue(new Cache(redisConfig, defaultRedisClient, "auth:access_token", "EX", 10000));
        return this;
    }

    protected useDbPool(useFake?: boolean) {
        this.container.bind<PgConfig>(IOC_TYPES.PgConfig).to(PgConfig);
        let pgConfig = this.container.get<PgConfig>(IOC_TYPES.PgConfig)
        let logger = this.container.get<Logger>(IOC_TYPES.Logger)
        this.container.bind<Pool>(IOC_TYPES.DbPool).toConstantValue(new Pool(new PgPoolConfig(logger, pgConfig)));
        return this;
    }

    protected useRouter() {
        this.container.bind<TestRouter>("TestRouter").to(TestRouter);
        return this;
    }

    protected useServer() {
        this.container.bind<IHttpServer>("TestHttpServer").to(TestHttpServer);
        return this;
    }

    async create() {
        return this
            .useConfig()
            .useLogger()
            .useRedisClient()
            .useCache()
            .useDbPool()
            .useRouter()
            .useServer();
    }

}


class AppRouterTestTest extends AppRouterTest<TestRouter>{


    doTest = () => {

        describe("base router test", () => {


            describe('server functions', () => {

                let req, res, next, server, app; let router: TestRouter;

                beforeEach(async () => {
                    ({ req, res, next, server, app, router } = await this.initMethodTest());
                })

                afterEach(async () => await server.finalize())

                test('should return a full url without query params', () => {

                    let url = router.buildUrl('http://localhost:80', {});
                    expect(url).toEqual('http://localhost:80/');

                    url = router.buildUrl('http://localhost:80', null);
                    expect(url).toEqual('http://localhost:80/');

                })

                test('should return a full url with query params', () => {

                    let url = router.buildUrl('http://localhost:80', { key1: "v1", key2: "v2" });
                    expect(url).toEqual('http://localhost:80/?key1=v1&key2=v2');

                })

                test("should create http and https server", () => {
                    jest.spyOn(server.serverConfig, "HTTPS_ONLY", "get").mockReturnValueOnce("0");
                    let s = server.createServer();
                    expect(s.httpServer).toBeDefined();
                    expect(s.httpsServer).toBeDefined();
                })

                test("should create https server only", () => {
                    jest.spyOn(server.serverConfig, "HTTPS_ONLY", "get").mockReturnValueOnce("1");
                    let s = server.createServer();
                    expect(s.httpServer).toBeUndefined();
                    expect(s.httpsServer).toBeDefined();
                })

            })


            describe("mocked middlewares", () => {

                let req, res, next, server, app, router: TestRouter;
                let middlewares = {
                    setNoCacheMiddleware: jest.fn().mockImplementation(async (req, res, next) => { next() }),
                }

                beforeEach(async () => {
                    ({ server, app, router } = await this.initRouterTest(middlewares));
                });

                afterEach(async () => await server.finalize());

                test("should use mocked middlewares", done => {
                    supertest(app)
                        .post("/")
                        .then(res => {
                            expect(middlewares.setNoCacheMiddleware).toHaveBeenCalledTimes(1);
                            done();
                        });
                });

            });


            describe("default mocked middlewares", () => {

                let req, res, next, server, app, router: TestRouter;
                let middlewares = {
                    setNoCacheMiddleware: jest.fn().mockImplementation(async (req, res, next) => { next() }),
                }

                beforeEach(async () => {
                    ({ server, app, router } = await this.initRouterTest());
                });

                afterEach(async () => await server.finalize());

                test("should use default mocked middlewares", done => {
                    supertest(app)
                        .post("/")
                        .then(res => {
                            expect(middlewares.setNoCacheMiddleware).toHaveBeenCalledTimes(0);
                            expect(router.setNoCacheMiddleware).toHaveBeenCalledTimes(1);
                            done();
                        });
                });

            });


            describe("middlewares", () => {

                let req, res, next, server, app, router: TestRouter;

                beforeEach(async () => {
                    ({ req, res, next, server, app, router } = await this.initMiddlewareTest());
                });

                afterEach(async () => await server.finalize());

                test("should log trival error", () => {
                    let logConfigMock1 = jest.spyOn(server.loggerConfig, 'NO_HTTP_ERROR_LOG', 'get').mockReturnValueOnce("0");
                    let logMock1 = jest.spyOn(server.logger, "error").mockImplementationOnce((obj) => { });
                    server.logErrorMiddleware(new AppError("trival error", "NO_BIG_DEAL", errorSererity.TRIVIAL), req, res, next);
                    expect((<any>logMock1.mock.calls[0][0]).err).toBeDefined();
                    expect((<any>logMock1.mock.calls[0][0]).req).toBeUndefined();
                    expect((<any>logMock1.mock.calls[0][0]).res).toBeUndefined();
                });

                test("should log verbose error", () => {
                    let logConfigMock1 = jest.spyOn(server.loggerConfig, 'NO_HTTP_ERROR_LOG', 'get').mockReturnValueOnce("0");
                    let logMock1 = jest.spyOn(server.logger, "error").mockImplementationOnce((obj) => { });
                    server.logErrorMiddleware(new Error(), req, res, next);
                    expect((<any>logMock1.mock.calls[0][0]).err).toBeDefined();
                    expect((<any>logMock1.mock.calls[0][0]).req).toBeDefined();
                    expect((<any>logMock1.mock.calls[0][0]).res).toBeDefined();
                });

                test("should return default properties of 500 UNKNOWN_ERROR", () => {
                    server.handleErrorMiddleware(new Error(), req, res, next);
                    expect((<any>res.status.mock.calls[0][0])).toBe(500);
                    expect((<any>res.json.mock.calls[0][0]).errorCode).toBe("UNKNOWN_ERROR");
                });

                test("should return default properties of 500 UNKNOWN_ERROR", () => {
                    server.handleErrorMiddleware(new AppError("trival error", "NO_BIG_DEAL", errorSererity.TRIVIAL, 400), req, res, next);
                    expect((<any>res.status.mock.calls[0][0])).toBe(400);
                    expect((<any>res.json.mock.calls[0][0]).errorCode).toBe("NO_BIG_DEAL");
                });

            });


            describe("test the routes", () => {

                let server, app; let router: TestRouter;

                beforeEach(async () => {
                    ({ server, app, router } = await this.initRouterTest({}));
                })

                afterEach(async () => await server.finalize())

                test("it should return 401 if access_token not found in request", done => {
                    supertest(app)
                        .post("/")
                        .then(res => {
                            expect(res.status).toBe(401);
                            expect(res.body.errorCode).toBe("MISSING_ACCESS_TOKEN");
                            done();
                        });
                });

                test("it should return 401 if access_token not found in cache", done => {
                    router.accessTokenCache.getObj = jest.fn().mockResolvedValueOnce(null);
                    supertest(app)
                        .post("/")
                        .set("authorization", "bearer access_token123")
                        .then(res => {
                            expect(router.accessTokenCache.getObj).toHaveBeenCalledTimes(1);
                            expect(res.status).toBe(401);
                            done();
                        });
                });

                test("it should return 401 if client not in the resource allowed clients", done => {
                    let mockedClients = jest.spyOn(router, "allowedClients", "get").mockClear().mockReturnValueOnce(["clientId1231"]).mockReturnValueOnce(["clientId1231"]);
                    router.accessTokenCache.getObj = jest.fn().mockResolvedValueOnce({ access_token: "access_token123", client_id: "clientId123", user: { mob: "18975331833" } });
                    supertest(app)
                        .post("/")
                        .set("authorization", "bearer access_token123")
                        .then(res => {
                            expect(mockedClients).toHaveBeenCalledTimes(2);
                            expect(router.accessTokenCache.getObj).toHaveBeenCalledTimes(1);
                            expect(res.status).toBe(401);
                            done();
                        });
                });

                test("it should return 200 if client in the resource allowed clients", done => {
                    let mockedClients = jest.spyOn(router, "allowedClients", "get").mockClear().mockReturnValueOnce(["clientId123"]).mockReturnValueOnce(["clientId123"]);
                    router.accessTokenCache.getObj = jest.fn().mockResolvedValueOnce({ access_token: "access_token123", client_id: "clientId123", user: { mob: "18975331833" } });
                    supertest(app)
                        .post("/")
                        .set("authorization", "bearer access_token123")
                        .then(res => {
                            expect(mockedClients).toHaveBeenCalledTimes(2);
                            expect(router.accessTokenCache.getObj).toHaveBeenCalledTimes(1);
                            expect(res.status).toBe(200);
                            done();
                        });
                });

                test("it should return 401, if token not in header", done => {
                    router.accessTokenCache.getObj = jest.fn().mockResolvedValueOnce({ access_token: "access_token123", client_id: "clientId123", user: { mob: "18975331833" } });
                    supertest(app)
                        .post("/?access_token=access_token123")
                        .then(res => {
                            expect(router.accessTokenCache.getObj).toHaveBeenCalledTimes(0);
                            expect(res.status).toBe(401);
                            done();
                        });
                });

                test("it should return 401, if token in the request body", done => {
                    router.accessTokenCache.getObj = jest.fn().mockResolvedValueOnce({ access_token: "access_token123", client_id: "clientId123", user: { mob: "18975331833" } });
                    supertest(app)
                        .post("/")
                        .send({ access_token: "access_token123" })
                        .then(res => {
                            expect(router.accessTokenCache.getObj).toHaveBeenCalledTimes(0);
                            expect(res.status).toBe(401);
                            done();
                        });
                });

                test("it should return 200, if access_token found", done => {
                    router.accessTokenCache.getObj = jest.fn().mockResolvedValueOnce({ access_token: "access_token123", client_id: "clientId123", user: { mob: "18975331833" } });
                    supertest(app)
                        .post("/")
                        .set("authorization", "bearer access_token123")
                        .then(res => {
                            expect(router.accessTokenCache.getObj).toHaveBeenCalledTimes(1);
                            expect(res.status).toBe(200);
                            done();
                        });
                });

            });

        });

    };

}

new AppRouterTestTest("testRouter", "TestHttpServer", TestModule).doTest();