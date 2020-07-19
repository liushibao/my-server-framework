import redis, { RedisClient, Multi } from 'redis';
import { promisify } from 'util';
import redislock from 'redis-lock';
import { RedisConfig } from '../configs';
import { injectable, inject } from "../container";


export interface ILockRequest {
  key: string;
  cache: Cache;
}


export interface ICacheClient {
  readonly redisClient: redis.RedisClient;
  set(key: any, value: any, expiryMode?: string, time?: number): Promise<any>;
  get(key: any): Promise<any>;
  del(key: any): Promise<any>;
  expire(key: any, seconds: number): Promise<any>;
  exists(key: any): Promise<any>;
  // multi(args: any[]): Promise<Multi>;
  quit(): Promise<any>;
}

export class RedisClientAdapter implements ICacheClient {

  constructor(public readonly redisClient: redis.RedisClient) {
    this.set = promisify(this.redisClient.set).bind(this.redisClient);
    this.get = promisify(this.redisClient.get).bind(this.redisClient);
    this.del = promisify(this.redisClient.del).bind(this.redisClient);
    this.expire = promisify(this.redisClient.expire).bind(this.redisClient);
    this.exists = promisify(this.redisClient.exists).bind(this.redisClient);
    // this.multi = promisify(this.redisClient.multi).bind(this.redisClient);
    this.quit = promisify(this.redisClient.quit).bind(this.redisClient);
  }

  set: (key: any, value: any, expiryMode?: string, time?: number) => Promise<any>;
  get: (key: any) => Promise<any>;
  del: (key: any) => Promise<any>;
  expire: (key: any, seconds: number) => Promise<any>;
  exists: (key: any) => Promise<any>;
  // multi: (args: any[]) => Multi;
  quit: () => Promise<any>;

}


/* istanbul ignore next */
export const createRedisClient = (redisConfig?: RedisConfig): ICacheClient => {

  if (redisConfig)
    return new RedisClientAdapter(redis.createClient({
      host: redisConfig.REDIS_HOST, port: redisConfig.REDIS_PORT, password: redisConfig.REDIS_PASSWORD
    }));
  else
    return {
      redisClient: {} as unknown as redis.RedisClient,
      async set(key: any, value: any, expiryMode?: string, time?: number): Promise<any> { return },
      async get(key: any): Promise<any> { throw new Error("Method not implemented."); },
      async del(key: any): Promise<any> { return },
      async expire(key: any, seconds: number): Promise<any> { return },
      async exists(): Promise<any> { return true; },
      async quit(): Promise<any> { return },
    };

}


/**
 * // TODO ... 
 * Cache functions (except the constructor) should be exception safe, no throw guranteed, because in executor callbacks we only need and able to maintain pgsql transaction integrity, so let it be if the cache fail.
 */
@injectable()
export class Cache implements Cache {

  /**
   * 
   * @param redisConfig 
   * @param keyPrefix 
   * @param expiryMode see https://redis.io/commands/set
    EX seconds -- Set the specified expire time, in seconds.
    PX milliseconds -- Set the specified expire time, in milliseconds.
    NX -- Only set the key if it does not already exist.
    XX -- Only set the key if it already exist.
    KEEPTTL -- Retain the time to live associated with the key.
   * @param timeOut 
   */
  constructor(redisConfig: RedisConfig, redisClient: ICacheClient, keyPrefix, expiryMode: string, timeOut: number) {
    this._expiryMode = expiryMode;
    this._timeOut = timeOut;
    this._keyPrefix = `${redisConfig.REDIS_PREFIX}:${keyPrefix}`;
    this._redis = redisClient;
  }

  private _timeOut: number;
  private get timeOut(): number {
    return this._timeOut;
  }

  // https://redis.io/commands/set
  private _expiryMode: string;
  private get expiryMode(): string {
    return this._expiryMode;
  }

  private _keyPrefix: string;
  private get keyPrefix(): string {
    return this._keyPrefix;
  }

  private _redis: ICacheClient;
  public get redis(): ICacheClient {
    return this._redis;
  }

  private _lock: any;
  private get lock(): any {
    if (!this._lock)
      this._lock = promisify(redislock(this.redis.redisClient));
    return this._lock;
  }

  public async getLock(key: string) {
    return this.lock(this.prefixKey(key));
  }

  public prefixKey(key: string) {
    return `${this.keyPrefix}:${key}`;
  }

  async setObj(key, value) {
    return this.redis.set(this.prefixKey(key), JSON.stringify(value), this.expiryMode, this.timeOut);
  }

  async getObj(key): Promise<any> {
    let str = await this.redis.get(this.prefixKey(key));
    return JSON.parse(str);
  }

  async del(key) {
    return this.redis.del(this.prefixKey(key));
  }

  /**
   * 
   * @param key 
   * @param seconds EXPIRE key seconds see https://redis.io/commands/expire
   */
  async expire(key, seconds: number): Promise<any> {
    return this.redis.expire(this.prefixKey(key), seconds);
  }

  async exists(key): Promise<any> {
    return this.redis.exists(this.prefixKey(key));
  }

  async finalize() {
    await this.redis.quit();
  }

}