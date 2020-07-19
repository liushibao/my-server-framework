import { Multi } from 'redis';
import { IService } from './service';
import { CmdLog } from '../entities';
import { Message } from 'node-rdkafka';
import { Cache } from 'cache';
import { RedisConfig } from 'configs';


export class ExecutorCacheService implements IService {

    constructor(
        protected redisConfig: RedisConfig) {
    }

    finalize(): Promise<void> {
        return;
    }

    /**
      * @param cb business logic for updating database should go here
     */
    handleCommand = async <T extends CmdLog>(messages: Message[], cache: Cache, cb: (msg: Message, cache: Multi) => Promise<Multi>) => {

        let msgs: Message[];

        msgs = messages.filter(async (t) => !await cache.exists(t.key));

        // TODO ... evaluate adding cache lock here
        // https://redis.io/topics/transactions

        let multi = cache.redis.redisClient.multi();

        msgs.forEach(async (msg) => {
            multi = await cb(msg, multi);
            multi = multi.set(cache.prefixKey(msg.key.toString()), msg.timestamp.toString(), "EX", this.redisConfig.REDIS_CMD_LOG_KEY_EXPIRES_IN);
        });

        return multi.exec();

    };

}
