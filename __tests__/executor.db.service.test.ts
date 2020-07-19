import "reflect-metadata";
import path from 'path'
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../dist/.env") });

import { Pool } from 'pg'
import { Repository, Uuid, IAppModule, dbCmdLogTableName, CmdLog, IocContainer, RedisConfig, LoggerConfig, KfkConfig, Logger, ICacheClient, createRedisClient, PgConfig, PgPoolConfig, UserRole, ILoggerClient, DefaultLoggerClient, DbExecutor, ITopic, HttpServer, ServerConfig, IHttpServer, IServiceTestModule } from '../src'
import { ServiceTest } from '../src';
import { User, Cache } from '../src';
import { IOC_TYPES } from "../src";


import { injectable, inject } from '../src';
import { Message } from 'node-rdkafka';
import { ExecutorDbService } from "../src";

const COMMANDS: { [key: string]: ITopic } = {

    CreateUser: {
        topic: "create.user",
        version: 0
    }

}

@dbCmdLogTableName(COMMANDS.CreateUser.topic, COMMANDS.CreateUser.version)
export class CreateUserCmdLog extends CmdLog {
}


@injectable()
export class UserService extends ExecutorDbService {

    constructor(
        @inject(IOC_TYPES.DbPool) protected dbPool: Pool,
        @inject("IOC_TYPES.CreateUserCmdLogRepository") private createUserCmdLogs: Repository<CreateUserCmdLog>,
        @inject(IOC_TYPES.UserRepository) private users: Repository<User>) {
        super(dbPool);
    }

    async createUser(messages: Message[]) {

        await this.handleCommand(messages, this.createUserCmdLogs,

            async (msgs: Message[], dbClient) => {

                let users = msgs.map(t => JSON.parse(t.value.toString()));
                await this.users.addBatch(dbClient, users);

            },

        );

    }

}


@injectable()
export class AuthExecutorServer {

    constructor(
        @inject(IOC_TYPES.Logger) private logger: Logger,
        @inject(IOC_TYPES.ILoggerClient) private loggerClient: ILoggerClient,
        @inject("IOC_TYPES.CreateUserExecutor") private createUserExecutor: DbExecutor<CreateUserCmdLog>,
        @inject("IOC_TYPES.ExecutorUserService") private userService: UserService) {
    }


    async setup() {
        await this.createUserExecutor.register(this.userService.createUser);
        await this.loggerClient.initConsumer();
    }


    async finalize() {
        await this.loggerClient.finalize();
    }

}


export class ExecutorDbServiceTestModule implements IServiceTestModule {

    dbName: string;

    container = new IocContainer();

    protected useConfig() {
        this.container.bind<ServerConfig>(IOC_TYPES.ServerConfig).to(ServerConfig);
        this.container.bind<LoggerConfig>(IOC_TYPES.LoggerConfig).to(LoggerConfig);
        this.container.bind<RedisConfig>(IOC_TYPES.RedisConfig).to(RedisConfig);
        this.container.bind<KfkConfig>(IOC_TYPES.KfkConfig).to(KfkConfig);
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

    protected useRedislock(useFake?: boolean) {
        let defaultRedisClient = this.container.get<ICacheClient>(IOC_TYPES.DefaultRedisClient);
        // this.container.bind<Redlock>(IOC_TYPES.RedisLock).toConstantValue(new Redlock([defaultRedisClient]));
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
        this.container.bind<Repository<User>>(IOC_TYPES.UserRepository).toConstantValue(new Repository(User));
        this.container.bind<Repository<UserRole>>(IOC_TYPES.UserRoleRepository).toConstantValue(new Repository(UserRole));
        this.container.bind<Repository<CreateUserCmdLog>>("IOC_TYPES.CreateUserCmdLogRepository").toConstantValue(new Repository(CreateUserCmdLog));
        return this;
    }

    protected useLoggerClient(useFake?: boolean) {
        this.container.bind<ILoggerClient>(IOC_TYPES.ILoggerClient).to(DefaultLoggerClient).inSingletonScope();
        return this;
    };

    protected useExecutor() {
        this.container.bind<DbExecutor<CreateUserCmdLog>>("IOC_TYPES.CreateUserExecutor").to(DbExecutor).inSingletonScope();
        this.container.get<DbExecutor<CreateUserCmdLog>>("IOC_TYPES.CreateUserExecutor").topic = COMMANDS.CreateUser;
        return this;
    }

    protected useService() {
        this.container.bind<UserService>("IOC_TYPES.ExecutorUserService").to(UserService).inSingletonScope();
        return this;
    }

    protected useServer() {
        this.container.bind<AuthExecutorServer>("IOC_TYPES.AuthExecutorServer").to(AuthExecutorServer).inSingletonScope();
        return this;
    }

    async create() {
        return this
            .useConfig()
            .useLogger()
            .useRedisClient()
            .useRedislock()
            .useCache()
            .useDbPool()
            .useRepository()
            .useService()
            .useLoggerClient()
            .useExecutor()
            .useServer();
    }

}

/**
 * 不能和AppModule放在同一个文件，因为AppModule文件有启动服务器的操作
 */
export class ServiceTestModule extends ExecutorDbServiceTestModule implements IAppModule {

    async create() {
        return this
            .useConfig()
            .useLogger(true)
            .useRedisClient(true)
            // .useRedislock(true)
            .useCache()
            .useDbPool(true)
            .useRepository()
            .useService()
            .useLoggerClient(true)
            .useExecutor()
            .useServer();
    }

}

class UserServiceTest extends ServiceTest<UserService>{

    doTest = () => {

        describe("test users", () => {

            test("createUser should work", async done => {

                let userId = Uuid.v4();
                let userId2 = Uuid.v4();
                let keyId = Uuid.v4();
                let keyId2 = Uuid.v4();
                let messages = [
                    {
                        value: Buffer.from(JSON.stringify({ id: userId, mob: '18016243752', password: 'bob123' })),
                        size: 123,
                        topic: "dev.unit.test.0",
                        key: keyId,
                        timestamp: new Date('2010-11-11').valueOf(),
                        offset: 100,
                        partition: 0
                    },
                    {
                        value: Buffer.from(JSON.stringify({ id: userId2, mob: '18016243732', password: 'bobabc' })),
                        size: 123,
                        topic: "dev.unit.test.0",
                        key: keyId2,
                        timestamp: new Date('2010-11-11').valueOf(),
                        offset: 101,
                        partition: 0
                    }
                ];
                await this.service.createUser(messages);
                let user = await (<Repository<User>>(<any>this.service).users).singleOrDefault<User>((<any>this.service).dbPool, { mob: '18016243752', password: 'bob123' });
                expect(user.mob).toBe("18016243752");
                expect(user.password).toBe('bob123');
                expect(user.id).toBe(userId);

                let user2 = await (<Repository<User>>(<any>this.service).users).singleOrDefault<User>((<any>this.service).dbPool, { mob: '18016243732', password: 'bobabc' });
                expect(user2.mob).toBe("18016243732");
                expect(user2.password).toBe('bobabc');
                expect(user2.id).toBe(userId2);

                let cmdLog = await (<Repository<CreateUserCmdLog>>(<any>this.service).createUserCmdLogs).singleOrDefault<CreateUserCmdLog>((<any>this.service).dbPool, { key: keyId });
                expect(JSON.stringify(cmdLog.timestamp)).toBe(JSON.stringify(new Date('2010-11-11')));

                let cmdLog2 = await (<Repository<CreateUserCmdLog>>(<any>this.service).createUserCmdLogs).singleOrDefault<CreateUserCmdLog>((<any>this.service).dbPool, { key: keyId2 });
                expect(JSON.stringify(cmdLog2.timestamp)).toBe(JSON.stringify(new Date('2010-11-11')));

                done();
            });
        });

    }

}


new UserServiceTest("IOC_TYPES.ExecutorUserService", "IOC_TYPES.AuthExecutorServer", ServiceTestModule).setup(path.resolve(__dirname, `testdb.dmp`)).doTest();
