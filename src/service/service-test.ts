import fs from 'fs';
import util from 'util';
import { Pool } from 'pg';
import randomstring from 'randomstring';
import { Logger } from '../logger';
import { IService } from './service';
import { IOC_TYPES } from '../IOC_TYPES';
import { IocContainer } from '../container';
import { IServiceTestModule } from '../IAppModule';
import { PgConfig, LoggerConfig, PgPoolConfig } from '../configs';


/**
 * extends service test from this class, and implement the doTest method. typically run the test as following:
 * new RepositoryTest(Repository).setup(path.resolve(__dirname, `authentication-as-insert.dmp`), "users.users").doTest();
 */
export abstract class ServiceTest<T extends IService> {

    // service to be created in beforeEach, so no need to provide args when construct the test object
    // constructor(private testType: new (...args: any[]) => T, private args: any[]) {
    // constructor(private testType: new (...args: any[]) => T) {
    constructor(private testTypeIdentifier: string, private testServerIdentifier: string, private testModuleType: new (...args: any[]) => IServiceTestModule, ...args: any[]) {
    }

    service: T;
    logger: Logger = new Logger(new LoggerConfig());

    /**
     * setup before doTest.
     * @param dbDmpPath - the db template file, dumpped from an initial test db (typically including tables, functions, and seed data)
     * @param table - the table name for the testing service class. not required if the testing service class defined a default table name.
     */
    setup = (dbDmpPath: string): ServiceTest<T> => {

        if (!dbDmpPath) {
            beforeEach(async (done) => {
                let testModule = new this.testModuleType();
                testModule = await testModule.create();
                let container: IocContainer = testModule.container;
                this.service = container.get(this.testTypeIdentifier);
            });
            return this;
        }

        jest.setTimeout(50000);
        let dbName: string;


        beforeEach(async (done) => {

            process.env.PG_DATABASE = "postgres";
            let dbPool = new Pool(new PgPoolConfig(this.logger, new PgConfig()));

            dbName = `testdb_` + randomstring.generate().toLowerCase();
            await dbPool.query(`create database ${dbName}`);
            this.logger.debug(`created db ${dbName}`);
            await dbPool.end();

            let testModule = new this.testModuleType();
            testModule.dbName = dbName;
            testModule = await testModule.create();
            let container: IocContainer = testModule.container;
            this.service = container.get(this.testTypeIdentifier);
            dbPool = await container.get<Pool>(IOC_TYPES.DbPool);
            let readFile = util.promisify(fs.readFile);
            let sql = await readFile(dbDmpPath, 'utf8');
            await dbPool.query(sql);

            if (this.testServerIdentifier) {
                let server = container.get(this.testServerIdentifier);
                if ((<any>server).setup) {
                    if ((<any>server).loggerClient) {
                        (<any>server).loggerClient.initProducer = jest.fn().mockImplementation(async () => { return true; });
                        (<any>server).loggerClient.initConsumer = jest.fn().mockImplementation(async () => { return true; });
                        (<any>server).loggerClient.finalize = jest.fn().mockImplementation(async () => { return; });
                        (<any>server).setup();
                    }
                }
            }

            done();

        });


        afterEach(async () => {

            await this.service.finalize();

            process.env.PG_DATABASE = "postgres";
            let dbPool = new Pool(new PgPoolConfig(this.logger, new PgConfig()));
            await dbPool.query(`drop database ${dbName}`);
            this.logger.debug(`dropped db ${dbName}`);
            await dbPool.end();

        });


        /* istanbul ignore next */
        afterAll(async () => {

            process.env.PG_DATABASE = "postgres";
            let dbPool = new Pool(new PgPoolConfig(this.logger, new PgConfig()));
            let testdbs = (await dbPool.query(`select * from pg_database where datname like 'testdb_%'`)).rows;

            testdbs.forEach(async (t) => {
                process.env.PG_DATABASE = "postgres";
                let pool2 = new Pool(new PgPoolConfig(this.logger, new PgConfig()));
                await pool2.query(`drop database ${t.datname}`);
                this.logger.debug(`dropped db ${t.datname}`);
                await pool2.end();
            });

            await dbPool.end();

        });

        return this;

    };


    /**
     * do real test here, please override this method with your actual test code
     */


    abstract doTest = () => {
    };

}
