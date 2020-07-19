import util from 'util';
import { Uuid } from '../uuid/uuid';
import { DefaultLoggerClient } from './LoggerClient';
import { HighLevelProducer, NumberNullUndefined, MessageHeader } from 'node-rdkafka';
import { Logger } from '../logger';
import { injectable, inject } from '../container';
import getDecorators from "inversify-inject-decorators";

import { IOC_TYPES } from '../IOC_TYPES';
import { KfkConfig } from '../configs';
import { ITopic } from './ITopic';


export interface ICommander {
    sendMessage: (message, replicaVersions?: number[]) => Promise<any>;
    topic: ITopic;
}


export interface IKafkaPayload {
    topic: string,
    partition: NumberNullUndefined,
    message: any, key: any,
    timestamp: NumberNullUndefined,
    headers?: MessageHeader[]
}


@injectable()
export class Commander implements ICommander {

    constructor(
        /** environment prefix not included */
        @inject(IOC_TYPES.KfkConfig) private kfkConfig: KfkConfig,
        @inject(IOC_TYPES.ILoggerClient) private loggerClient: DefaultLoggerClient,
    ) {
    }

    private _topic: ITopic;
    public get topic(): ITopic {
        return this._topic;
    }
    public set topic(value: ITopic) {
        this._topic = value;
    }

    private _producer: HighLevelProducer;
    private get producer(): HighLevelProducer {
        if (!this._producer)
            this._producer = <HighLevelProducer>this.loggerClient.producer;
        return this._producer;
    }

    private _produce: (payload: IKafkaPayload) => Promise<number>;
    private get produce(): (payload: IKafkaPayload) => Promise<number> {
        if (!this._produce) {
            let produce = (payload: IKafkaPayload, callback: (err: any, offset?: NumberNullUndefined) => void) => {

                if (!Buffer.isBuffer(payload.message)) {
                    if ((typeof payload.message) == "string")
                        payload.message = Buffer.from(payload.message);
                    else
                        payload.message = Buffer.from(JSON.stringify(payload.message));
                }

                if (payload.headers)
                    this.producer.produce(payload.topic, payload.partition, payload.message, payload.key, payload.timestamp, payload.headers, callback);
                else
                    this.producer.produce(payload.topic, payload.partition, payload.message, payload.key, payload.timestamp, callback);
            }
            this._produce = util.promisify(produce);
        }
        return this._produce;
    }

    sendMessage = async (message, replicaVersions?: number[]) => {
        let self=this;
        let payload: IKafkaPayload = {
            topic: `${self.kfkConfig.KFK_PREFIX}.${this.topic.topic}.${this.topic.version}`,
            partition: null,
            message: message,
            key: Uuid.v4(),
            timestamp: Date.now()
        };

        if (replicaVersions && replicaVersions.length > 0)
            replicaVersions.forEach(t => {
                this.produce({ ...payload, topic: `${this.kfkConfig.KFK_PREFIX}.${this.topic.topic}.${t}`, headers: [{ "type": "REPLICA" }] });
            });

        let offset = this.produce(payload);

        return offset;
    }

}