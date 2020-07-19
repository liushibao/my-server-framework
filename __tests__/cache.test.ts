import "reflect-metadata";
import path from 'path'
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../dist/.env") });


// const mockRedis = {
//     set(key: any, value: any, expiryMode?: string, time?: number): Promise<any> { return null; },
//     get(key: any): Promise<any> { return null; },
//     del(key: any): Promise<any> { return null; },
//     expire(key: any, seconds: number): Promise<any> { return null; },
//     quit(): Promise<any> { return null; },
// };


import redis from 'redis';

import { Uuid } from '../src/uuid/uuid';

import { createRedisClient, Cache, RedisConfig } from '../src'

let redisConfig = new RedisConfig();


describe("Cache", () => {

    let testCache: Cache;

    beforeEach(() => {
        testCache = new Cache(redisConfig, createRedisClient(), "auth:unit:test", "EX", 10000);
    })

    test("should create a cache with right prefix", () => {
        redis.createClient = jest.fn().mockImplementationOnce((options) => createRedisClient());
        let mockREDIS_PREFIX = jest.spyOn(redisConfig, 'REDIS_PREFIX', 'get').mockReturnValueOnce("dev");
        let cache = new Cache(redisConfig, createRedisClient(redisConfig), "auth:unit:test", "EX", 10000);
        expect(mockREDIS_PREFIX).toBeCalledTimes(1);
        expect((<any>cache).keyPrefix).toBe("dev:auth:unit:test");
        expect((<any>redis.createClient).mock.calls[0][0].host).toBe(redisConfig.REDIS_HOST);
        expect((<any>redis.createClient).mock.calls[0][0].port).toBe(redisConfig.REDIS_PORT);
    });

    test("should call redis del with right args", async () => {


        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        (<any>testCache).redis.del = jest.fn().mockReturnValueOnce(null);
        let result = await testCache.del('fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect((<any>testCache).redis.del).toBeCalledTimes(1);
        expect((<any>testCache).redis.del.mock.calls[0][0]).toBe('dev:auth:unit:test:fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect(result).toBe(null);

    });

    test("should call redis expire with right args", async () => {

        redis.createClient = jest.fn().mockImplementationOnce((options) => createRedisClient());

        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        (<any>testCache).redis.expire = jest.fn().mockReturnValueOnce(null);

        let result = await testCache.expire('fec12a66-47e1-4d25-9acd-fe851d24575c', 10000);

        expect((<any>testCache).redis.expire).toBeCalledTimes(1);
        expect((<any>testCache).redis.expire.mock.calls[0][0]).toBe('dev:auth:unit:test:fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect((<any>testCache).redis.expire.mock.calls[0][1]).toBe(10000);

    });

    test("should call redis set with right args", async () => {

        redis.createClient = jest.fn().mockImplementationOnce((options) => createRedisClient());

        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        (<any>testCache).redis.set = jest.fn().mockReturnValueOnce(null);
        let result = await testCache.setObj('fec12a66-47e1-4d25-9acd-fe851d24575c', { name: "bob" });
        expect((<any>testCache).redis.set).toBeCalledTimes(1);
        expect((<any>testCache).redis.set.mock.calls[0][0]).toBe('dev:auth:unit:test:fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect(JSON.parse((<any>testCache).redis.set.mock.calls[0][1]).name).toBe("bob");

    });

    test("should call redis get with right args", async () => {

        redis.createClient = jest.fn().mockImplementationOnce((options) => createRedisClient());

        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        (<any>testCache).redis.get = jest.fn().mockReturnValueOnce(`{"name":"bob"}`);
        let result = await testCache.getObj('fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect((<any>testCache).redis.get).toBeCalledTimes(1);
        expect((<any>testCache).redis.get.mock.calls[0][0]).toBe('dev:auth:unit:test:fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect(result.name).toBe("bob");

    });

    test("should call redis quit with right args", async () => {

        redis.createClient = jest.fn().mockImplementationOnce((options) => createRedisClient());

        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        (<any>testCache).redis.quit = jest.fn().mockReturnValueOnce(null);
        let result = await testCache.finalize();
        expect((<any>testCache).redis.quit).toBeCalledTimes(1);

    });

});