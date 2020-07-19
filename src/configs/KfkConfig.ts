import { Config } from './IConfig';
import { injectable, inject } from "inversify";

@injectable()
export class KfkConfig extends Config {

    constructor() {

        super();

        this._KFK_HOST = process.env.KFK_HOST;
        this._KFK_PORT = process.env.KFK_PORT;
        this._KFK_CLIENTID = process.env.KFK_CLIENTID.toLowerCase();
        this._KFK_PREFIX = process.env.KFK_PREFIX.toLowerCase();
        this._KFK_CONSUMER_GROUP_ID_PREFIX = process.env.KFK_CONSUMER_GROUP_ID_PREFIX;
        this._KFK_METADATAOPTIONS_TIMEOUT = Number.parseInt(process.env.KFK_METADATAOPTIONS_TIMEOUT);

        this.validate();

    }


    private _KFK_HOST: string;
    public get KFK_HOST(): string {
        return this._KFK_HOST;
    }

    private _KFK_PORT: string;
    public get KFK_PORT(): string {
        return this._KFK_PORT;
    }

    private _KFK_CLIENTID: string;
    public get KFK_CLIENTID(): string {
        return this._KFK_CLIENTID;
    }

    private _KFK_PREFIX: string;
    public get KFK_PREFIX(): string {
        return this._KFK_PREFIX;
    }

    private _KFK_CONSUMER_GROUP_ID_PREFIX: string;
    public get KFK_CONSUMER_GROUP_ID_PREFIX(): string {
        return this._KFK_CONSUMER_GROUP_ID_PREFIX;
    }

    private _KFK_METADATAOPTIONS_TIMEOUT: number;
    public get KFK_METADATAOPTIONS_TIMEOUT(): number {
        return this._KFK_METADATAOPTIONS_TIMEOUT;
    }

}