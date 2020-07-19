import { Uuid } from '../uuid/uuid';
import { DefaultLoggerClient, ILoggerClient } from './LoggerClient';
import { KfkConfig, LoggerConfig, PgPoolConfig, PgConfig } from "../configs";
import { KafkaConsumer, LibrdKafkaError, Message } from 'node-rdkafka';
import { inject, injectable } from '../container';
import { IOC_TYPES } from '../IOC_TYPES';
import { Repository } from '../repository';
import { CmdLog } from '../entities';
import { Logger } from '../logger';
import { Pool } from 'pg';
import { ITopic } from './ITopic';


@injectable()
export class DbExecutor<T extends CmdLog> {

    constructor(
        /** environment prefix not included */
        @inject(IOC_TYPES.Logger) private logger: Logger,
        @inject(IOC_TYPES.ILoggerClient) private loggerClient: ILoggerClient,
        @inject(IOC_TYPES.DbPool) private dbPool: Pool,
    ) {
    }

    private _topic: ITopic;
    public get topic(): ITopic {
        return this._topic;
    }
    public set topic(value: ITopic) {
        this._topic = value;
    }

    /**
     * 
     * @param cb process data in a transaction which write data and the {offset:key} to databaes
     */
    async register(cb: (messages: Message[]) => Promise<void>) {

        let self = this;

        let sql = `CREATE TABLE IF NOT EXISTS "command.logs"."${self.topic.topic}.${self.topic.version}" ("key" uuid, "timestamp" timestamp, PRIMARY KEY("key"));`;

        await this.dbPool.query(sql);

        self.loggerClient.registerExecutor({ ...this.topic, cb: cb });

    }

}