import { Config } from "./IConfig";
import { injectable, inject } from "inversify";

@injectable()
export class RedisConfig extends Config {

  constructor() {

    super();

    this._REDIS_HOST = process.env.REDIS_HOST;
    this._REDIS_PORT = Number.parseInt(process.env.REDIS_PORT);
    this._REDIS_PASSWORD = process.env.REDIS_PASSWORD;
    this._REDIS_PREFIX = process.env.REDIS_PREFIX.toLowerCase();
    this._REDIS_CMD_LOG_KEY_EXPIRES_IN = Number.parseInt(process.env.REDIS_CMD_LOG_KEY_EXPIRES_IN);

    this.validate();

  }


  private _REDIS_HOST: string;
  public get REDIS_HOST(): string {
    return this._REDIS_HOST;
  }


  private _REDIS_PORT: number;
  public get REDIS_PORT(): number {
    return this._REDIS_PORT;
  }


  private _REDIS_PASSWORD: string;
  get REDIS_PASSWORD(): string {
    return this._REDIS_PASSWORD;
  }


  private _REDIS_PREFIX: string;
  get REDIS_PREFIX(): string {
    return this._REDIS_PREFIX;
  }


  private _REDIS_CMD_LOG_KEY_EXPIRES_IN: number;
  public get REDIS_CMD_LOG_KEY_EXPIRES_IN(): number {
    return this._REDIS_CMD_LOG_KEY_EXPIRES_IN;
  }

}