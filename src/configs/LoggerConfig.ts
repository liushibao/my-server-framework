import { Config } from "./IConfig";
import { injectable, inject } from "inversify";

@injectable()
export class LoggerConfig extends Config {

    constructor() {

        super();

        this._NO_HTTP_ERROR_LOG = process.env.NO_HTTP_ERROR_LOG;
        this._LOG_LEVEL = process.env.LOG_LEVEL;

        this.validate();

    }

    private _NO_HTTP_ERROR_LOG: string;
    public get NO_HTTP_ERROR_LOG(): string {
        return this._NO_HTTP_ERROR_LOG;
    }

    private _LOG_LEVEL: string;
    public get LOG_LEVEL(): string {
        return this._LOG_LEVEL;
    }

}