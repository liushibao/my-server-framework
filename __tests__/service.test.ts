import "reflect-metadata";
import path from 'path'
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../dist/.env") });

import { Pool } from 'pg'
import { ServiceTest, User, IOC_TYPES, IAppModule, ServerConfig, Logger, IHttpServer, Repository, IService, PgConfig, RepositoryError, LoggerConfig, PgPoolConfig, IServiceTestModule, RedisConfig, ICacheClient, createRedisClient, Cache } from '../src';
import { IocContainer, injectable, inject, interfaces } from "../src";


@injectable()
class UserService implements IService {

    constructor(
        @inject("DbPool") private dbPool: Pool,
        @inject("UserRepository") private users: Repository<User>
    ) {
    }

    finalize(): Promise<void> {
        return this.dbPool.end();
    }

    async getUserByMob(mob: string, noCache: boolean = false) {
        return await this.users.singleOrDefault<User>(this.dbPool, { mob: mob });
    }

    async save(user: User) {
        let { nickname, name } = user;
        let dbClient = await this.dbPool.connect();
        try {
            await this.users.patch(dbClient, { id: user.id }, { nickname, name });
        } catch (err) {
            throw new RepositoryError("repository error");
        } finally {
            dbClient.release();
        }
    }

}


class TestModule implements IServiceTestModule {

    dbName: string;

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

    /**
     * 需要重写此方法，否则this.dbName不起作用
     */
    protected useDbPool(useFake?: boolean) {
        process.env.PG_DATABASE = this.dbName;
        this.container.bind<PgConfig>(IOC_TYPES.PgConfig).to(PgConfig);
        let pgConfig = this.container.get<PgConfig>(IOC_TYPES.PgConfig)
        let logger = this.container.get<Logger>(IOC_TYPES.Logger)
        this.container.bind<Pool>(IOC_TYPES.DbPool).toConstantValue(new Pool(new PgPoolConfig(logger, pgConfig)));
        return this;
    }

    protected useRepository() {
        // this.IocContainer.bind<interfaces.Newable<User>>(FRAMEWORK_TYPES.Newable_EntityType).toConstructor<User>(User);
        // this.IocContainer.bind<Repository<User>>("UserRepository").to(Repository<User>);
        this.container.bind<Repository<User>>("UserRepository").toConstantValue(new Repository(User));
        return this;
    }

    protected useService() {
        this.container.bind<UserService>("UserService").to(UserService);
        return this;
    }


    async create() {
        return this
            .useConfig()
            .useLogger()
            .useRedisClient()
            .useCache()
            .useDbPool()
            .useRepository()
            .useService();
    }

}


class UserServiceTest extends ServiceTest<UserService>{

    doTest = () => {

        describe("test users", () => {

            test("getUserByMob should work", async done => {

                let user = await this.service.getUserByMob('18116243752');
                expect(user.name).toBe("bob");

                user = await this.service.getUserByMob('18116243755');
                expect(user).toBe(null);

                done();
            });

            test("save should work", async done => {

                await this.service.save({
                    "id": "fdefce4f-a608-4038-a713-0774a06cf84c",
                    "nickname": "bob",
                    "name": "alice-new-patched",
                    "mob": "18975331833",
                    "email": "liushibao@163.com",
                    roles: []
                });
                let user = await this.service.getUserByMob('18975331833');
                expect(user.mob).toBe("18975331833");
                expect(user.nickname).toBe("bob");

                done();
            });
        });

    }

}


new UserServiceTest("UserService", null, TestModule).setup(path.resolve(__dirname, `testdb.dmp`)).doTest();
