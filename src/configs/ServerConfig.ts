import fs from 'fs';
import { ConfigError } from "../errors";
import { Config } from "./IConfig";
import { injectable, inject } from "inversify";

@injectable()
export class ServerConfig extends Config {

    constructor() {

        super();

        this._AUTH_SERVER_PORT = Number.parseInt(process.env.AUTH_SERVER_PORT);
        this._PORT = Number.parseInt(process.env.PORT);
        this._HOST = process.env.HOST;
        this._SERVER_KEY = process.env.SERVER_KEY;
        this._SERVER_CERT = process.env.SERVER_CERT;
        this._PROTOCOL = process.env.PROTOCOL;

        this.validate();

    }

    private _AUTH_SERVER_PORT: number;
    public get AUTH_SERVER_PORT(): number {
        return this._AUTH_SERVER_PORT;
    }

    private _PORT: number;
    public get PORT(): number {
        return this._PORT;
    }

    private _HOST: string;
    public get HOST(): string {
        return this._HOST;
    }

    private _SERVER_KEY: string;
    public get SERVER_KEY(): string {
        return this._SERVER_KEY;
    }

    private _SERVER_CERT: string;
    public get SERVER_CERT(): string {
        return this._SERVER_CERT;
    }

    private _PROTOCOL: string;
    public get PROTOCOL(): string {
        return this._PROTOCOL;
    }


    private _privateKey: string;
    private _certificate: string;

    get credentials() {
        if (!this._privateKey)
            this._privateKey = fs.readFileSync(this.SERVER_KEY, 'utf8');
        if (!this._certificate)
            this._certificate = fs.readFileSync(this.SERVER_CERT, 'utf8');
        return { key: this._privateKey, cert: this._certificate }
    };

    private _rootUrl: string;
    get rootUrl() {
        if (!this.HOST || !this.PORT)
            throw new ConfigError("environments HOST or PORT not found.");
        if (!this._rootUrl)
            this._rootUrl = `https://${this.HOST}:${this.PORT}`;
        return this._rootUrl;
    }

    private _authRootUrl: string;
    get authRootUrl() {
        if (!this.HOST || !this.AUTH_SERVER_PORT)
            throw new ConfigError("environments HOST or AUTH_SERVER_PORT not found.");
        if (!this._authRootUrl)
            this._authRootUrl = `https://${this.HOST}:${this.AUTH_SERVER_PORT}`;
        return this._authRootUrl;
    }

    // authorization server information
    get authEndpoints() {
        return {
            authorizationEndpoint: `${this.authRootUrl}/api/auth/authorize`,
            tokenEndpoint: `${this.authRootUrl}/api/auth/token`,
            loginPage: `${this.authRootUrl}/pages/login`,
        };
    }

}