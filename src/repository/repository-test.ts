import { Repository } from './repository';
import { Logger } from '../logger';
import randomstring from 'randomstring';
import fs from 'fs';
import util from 'util';
import { Pool, PoolClient } from 'pg';
import path from 'path';
import { table } from 'console';
import { PgConfig, LoggerConfig, PgPoolConfig } from '../configs';


/**
 * extends repository test from this class, and implement the doTest method. typically run the test as following:
 * new RepositoryTest(Repository).setup(path.resolve(__dirname, `authentication-as-insert.dmp`), "users.users").doTest();
 */
export abstract class RepositoryTest<TE, T extends Repository<TE>> {

    // repository to be created in beforeEach, so no need to provide args when construct the test object
    // constructor(private testType: new (...args: any[]) => T, private args: any[]) {
    constructor(private repositoryType: new (...args: any[]) => T, ...args: any[]) {
        this.args = args;
    }

    private args: any[];
    repository: T;
    testPool: Pool;
    logger: Logger = new Logger(new LoggerConfig());


    /**
     * setup before doTest.
     * @param dbDmpPath - the db template file, dumpped from an initial test db (typically including tables, functions, and seed data)
     */
    setup = (dbDmpPath: string): RepositoryTest<TE, T> => {

        jest.setTimeout(50000);
        let dbName: string;


        beforeEach(async (done) => {

            process.env.PG_DATABASE = "postgres";
            let dbPool = new Pool(new PgPoolConfig(this.logger, new PgConfig()));

            dbName = `testdb_` + randomstring.generate().toLowerCase();
            await dbPool.query(`create database ${dbName}`);
            this.logger.debug(`created db ${dbName}`);
            await dbPool.end();

            process.env.PG_DATABASE = dbName;
            this.testPool = new Pool(new PgPoolConfig(this.logger, new PgConfig()));
            let readFile = util.promisify(fs.readFile);
            let sql = await readFile(dbDmpPath, 'utf8');
            await this.testPool.query(sql);

            this.repository = new this.repositoryType(...this.args);

            done();

        });


        afterEach(async () => {

            await this.testPool.end();

            process.env.PG_DATABASE = "postgres";
            let dbPool = new Pool(new PgPoolConfig(this.logger, new PgConfig()));
            await dbPool.query(`drop database ${dbName}`);
            this.logger.debug(`dropped db ${dbName}`);
            await dbPool.end();

        });


        // https://codewithhugo.com/jest-exclude-coverage/
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
