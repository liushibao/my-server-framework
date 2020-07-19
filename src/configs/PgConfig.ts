import { Config } from './IConfig';
import { injectable, inject } from "inversify";
import { IOC_TYPES } from '../IOC_TYPES';
import { Logger } from '../logger';

@injectable()
export class PgConfig extends Config {

    constructor() {

        super();

        this._PG_USER = process.env.PG_USER;
        this._PG_HOST = process.env.PG_HOST;
        this._PG_PASSWORD = process.env.PG_PASSWORD;
        this._PG_DATABASE = process.env.PG_DATABASE;
        this._PG_PORT = Number.parseInt(process.env.PG_PORT);
        this._PG_MAX_CLIENT = Number.parseInt(process.env.PG_MAX_CLIENT);

        this.validate();

    }

    private _PG_USER: string;
    private _PG_HOST: string;
    private _PG_PASSWORD: string;
    private _PG_DATABASE: string;
    private _PG_PORT: number;
    private _PG_MAX_CLIENT: number;


    public get PG_USER(): string {
        return this._PG_USER;
    }


    public get PG_HOST(): string {
        return this._PG_HOST;
    }


    public get PG_PASSWORD(): string {
        return this._PG_PASSWORD;
    }


    public get PG_DATABASE(): string {
        return this._PG_DATABASE;
    }


    public get PG_PORT(): number {
        return this._PG_PORT;
    }


    public get PG_MAX_CLIENT(): number {
        return this._PG_MAX_CLIENT;
    }

}


@injectable()
export class PgPoolConfig {
    constructor(
        @inject(IOC_TYPES.Logger) private logger: Logger,
        @inject(IOC_TYPES.PgConfig) private pgConfig: PgConfig) {

    }

    user = this.pgConfig.PG_USER;
    database = this.pgConfig.PG_DATABASE;
    password = this.pgConfig.PG_PASSWORD;
    port = this.pgConfig.PG_PORT;
    host = this.pgConfig.PG_HOST;
    keepAlive = true;
    max = this.pgConfig.PG_MAX_CLIENT;
    log = msgs => this.logger.info(msgs);

}