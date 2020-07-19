// import { Kafka, logLevel, HighLevelProducer, ProducerConfig, Consumer, ConsumerConfig } from 'kafkajs';
import util from 'util';
import Kafka, { MetadataOptions, LibrdKafkaError, Metadata, Message } from 'node-rdkafka';
import { KfkConfig } from "../configs";
import { injectable, inject } from '../container';
import { IOC_TYPES } from '../IOC_TYPES';
import { ITopic } from './ITopic';
import { Logger } from '../logger';


export interface IExecutorTopic extends ITopic {
    cb: (messages: Message[]) => Promise<void>;
}

export interface ILoggerClient {
    initProducer: () => Promise<true | Kafka.Metadata>;
    initConsumer: () => Promise<true | Kafka.Metadata>;
    registerExecutor(executor: IExecutorTopic): void;
    readonly producer: Kafka.HighLevelProducer
    finalize(): Promise<void>;
}


@injectable()
export abstract class LoggerClient implements ILoggerClient {

    constructor(
        protected kfkConfig: KfkConfig,
        protected logger: Logger,
    ) {
    }

    initProducer = async () => {

        if (this.producer.isConnected())
            return true;

        let connFun = (metadataOptions: MetadataOptions, cb: (err: LibrdKafkaError, data: Metadata) => any) => {
            this.producer.connect(metadataOptions, cb);
        }
        let producerConnect = util.promisify(connFun);
        let result;
        try {
            result = await producerConnect({ timeout: this.kfkConfig.KFK_METADATAOPTIONS_TIMEOUT });
        } catch (err) {
            console.log(err)
        }
        return result;

    }

    registerExecutor(executor: IExecutorTopic) {
        this.executors.push(executor);
    }

    protected getFullTopic(self, t: ITopic) {
        return `${self.kfkConfig.KFK_PREFIX}.${t.topic}.${t.version}`;
    }

    /**
     * run after all executors registered
     */
    initConsumer = async () => {

        if (this.consumer.isConnected())
            return true;

        let connFun = (metadataOptions: MetadataOptions, cb: (err: LibrdKafkaError, data: Metadata) => any) => {
            this.consumer.connect(metadataOptions, cb);
        }
        let consumerConnect = util.promisify(connFun);
        let result = await consumerConnect({ timeout: this.kfkConfig.KFK_METADATAOPTIONS_TIMEOUT });

        let self = this;
        let topics = self.executors.map(t => self.getFullTopic(self, t));

        this.consumer.subscribe(topics);

        this.consumer.on('data', (message) => {
            let executor = this.executors.find(t => self.getFullTopic(self, t) == message.topic);
            let messages = [message]
            executor.cb(messages)
                .then(t => self.consumer.commit(messages))
                .catch(err => self.logger.error(err));
        });

        this.consumer.consume();

        return result;

    }

    protected _producer: Kafka.HighLevelProducer;
    get producer(): Kafka.HighLevelProducer {
        return this._producer;
    }

    protected _consumer: Kafka.KafkaConsumer;
    private get consumer(): Kafka.KafkaConsumer {
        return this._consumer;
    }

    private _executors: IExecutorTopic[] = [];
    private get executors(): IExecutorTopic[] {
        return this._executors;
    }

    async finalize() {
        if (this.producer?.isConnected())
            await this.producer.disconnect();
        if (this.consumer?.isConnected())
            await this.consumer.disconnect();
    }

}


@injectable()
export class DefaultLoggerClient extends LoggerClient {

    constructor(
        @inject(IOC_TYPES.KfkConfig) protected kfkConfig: KfkConfig,
        @inject(IOC_TYPES.Logger) protected logger: Logger,
    ) {
        super(kfkConfig, logger);

        this._producer = new Kafka.HighLevelProducer({
            'client.id': kfkConfig.KFK_CLIENTID,
            'metadata.broker.list': `${kfkConfig.KFK_HOST}:${kfkConfig.KFK_PORT}`,
            'compression.codec': 'gzip',
        });
        this.producer.setPollInterval(100);

        this._consumer = new Kafka.KafkaConsumer({
            'client.id': kfkConfig.KFK_CLIENTID,
            'group.id': kfkConfig.KFK_CONSUMER_GROUP_ID_PREFIX,
            'metadata.broker.list': `${kfkConfig.KFK_HOST}:${kfkConfig.KFK_PORT}`,
            'enable.auto.commit': false
        }, {});

    }

}