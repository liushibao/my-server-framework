import "reflect-metadata";
import path from 'path'
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../dist/.env") });

import { MetadataOptions, LibrdKafkaError, Metadata, librdkafkaVersion, Message } from 'node-rdkafka';

import { DefaultLoggerClient, Uuid, FakeCommander, Commander, ICommander, KfkConfig, Logger, IOC_TYPES, LoggerConfig } from '../src'
import { Container } from "inversify";

let kafkaClient: DefaultLoggerClient;

beforeAll(async done => {

    let container = new Container();
    container.bind<KfkConfig>(IOC_TYPES.KfkConfig).to(KfkConfig);
    container.bind<LoggerConfig>(IOC_TYPES.LoggerConfig).to(LoggerConfig);
    container.bind<Logger>(IOC_TYPES.Logger).to(Logger);
    let kfkConfig = container.get<KfkConfig>(IOC_TYPES.KfkConfig);
    jest.spyOn(kfkConfig, 'KFK_METADATAOPTIONS_TIMEOUT', 'get').mockReturnValue(1000);
    jest.setTimeout(kfkConfig.KFK_METADATAOPTIONS_TIMEOUT * 2 + 1000);
    container.bind<DefaultLoggerClient>(IOC_TYPES.ILoggerClient).to(DefaultLoggerClient);
    kafkaClient = container.get<DefaultLoggerClient>(IOC_TYPES.ILoggerClient);

    done();

});

afterAll(async done => {
    done();
});


describe("KafkaClient", () => {

    test('kafkaClient should not connect if is connected in inits', async done => {

        (<any>kafkaClient).consumer.isConnected = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(false);
        kafkaClient.producer.isConnected = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(false);
        kafkaClient.producer.connect = jest.fn().mockImplementationOnce(() => { });
        (<any>kafkaClient).consumer.connect = jest.fn().mockImplementationOnce(() => { });

        await kafkaClient.initProducer();
        await kafkaClient.initConsumer();

        expect((<any>kafkaClient).consumer.isConnected).toBeCalledTimes(1);
        expect((<any>kafkaClient).consumer.connect).toBeCalledTimes(0);
        expect(kafkaClient.producer.isConnected).toBeCalledTimes(1);
        expect(kafkaClient.producer.connect).toBeCalledTimes(0);

        done();

    });

    test('kafkaClient should connect in inits', async done => {

        (<any>kafkaClient).consumer.isConnected = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(false);
        kafkaClient.producer.isConnected = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(false);
        kafkaClient.producer.connect = jest.fn().mockImplementationOnce((metadataOptions: MetadataOptions, cb: (err: LibrdKafkaError, data: Metadata) => any) => {
            cb(undefined, {
                orig_broker_id: 1,
                orig_broker_name: "string",
                topics: [],
                brokers: []
            });
        });
        (<any>kafkaClient).consumer.connect = jest.fn().mockImplementationOnce((metadataOptions: MetadataOptions, cb: (err: LibrdKafkaError, data: Metadata) => any) => {
            cb(undefined, {
                orig_broker_id: 1,
                orig_broker_name: "string",
                topics: [],
                brokers: []
            });

        });

        (<any>kafkaClient).consumer.subscribe = jest.fn().mockImplementationOnce((topics) => { });
        (<any>kafkaClient).consumer.commit = jest.fn().mockImplementationOnce((messages: Message[]) => { });

        let producerConnected = await kafkaClient.initProducer();
        let callbackMock = jest.fn().mockImplementationOnce(async (messages: Message[]) => { }).mockRejectedValueOnce(new Error("failed to process data."));
        (<any>kafkaClient).registerExecutor({ topic: "unit.test", version: 0, cb: callbackMock })
        // (<any>kafkaClient).registerExecutor({ topic: "unit.test", version: 0, cb: async (messages: Message[]) => { } });
        let consumerConnected = await kafkaClient.initConsumer();
        let message =
        {
            value: Buffer.from(JSON.stringify({
                cons: { mob: "18016243752" },
                patchObj: {
                    "nickname": "bob",
                    "name": "alice-new-patched"
                }
            })),
            size: 123,
            topic: "dev.unit.test.0",
            key: Uuid.v4(),
            timestamp: new Date('2010-11-11').valueOf(),
            offset: 100,
            partition: 0
        };
        (<any>kafkaClient).consumer.emit('data', message);
        (<any>kafkaClient).consumer.emit('data', message);

        expect((<any>kafkaClient).consumer.isConnected).toBeCalledTimes(1);
        expect((<any>kafkaClient).consumer.connect).toBeCalledTimes(1);
        expect((<any>kafkaClient).consumer.subscribe).toBeCalledTimes(1);
        expect((<any>kafkaClient).consumer.subscribe.mock.calls[0][0].length).toBe(1);
        expect((<any>kafkaClient).consumer.subscribe.mock.calls[0][0][0]).toBe("dev.unit.test.0");
        expect(callbackMock).toBeCalledTimes(2);
        // expect((<any>kafkaClient).consumer.commit).toBeCalledTimes(1);
        // expect((<any>kafkaClient).consumer.commit.mock.calls[0][0].length).toBe(1);
        expect(kafkaClient.producer.isConnected).toBeCalledTimes(1);
        expect(kafkaClient.producer.connect).toBeCalledTimes(1);

        expect(producerConnected != null).toBe(true);
        expect(consumerConnected != null).toBe(true);

        done();

    });

    test('kafkaClient should fail to connect in inits', async done => {

        (<any>kafkaClient).consumer.isConnected = jest.fn().mockReturnValue(false);
        kafkaClient.producer.isConnected = jest.fn().mockReturnValue(false);
        kafkaClient.producer.connect = jest.fn().mockImplementationOnce((metadataOptions: MetadataOptions, cb: (err: LibrdKafkaError, data: Metadata) => any) => {
            cb({
                message: "kafka producer connection timeout.",
                code: 1,
                errno: 1,
                origin: "string;"
            }, undefined);
        });
        (<any>kafkaClient).consumer.connect = jest.fn().mockImplementationOnce((metadataOptions: MetadataOptions, cb: (err: LibrdKafkaError, data: Metadata) => any) => {
            cb({
                message: "kafka consumer connection timeout.",
                code: 1,
                errno: 1,
                origin: "string;"
            }, undefined);

        });

        try {
            await kafkaClient.initProducer();
        }
        catch (err) {
            expect(err.message).toBe("kafka producer connection timeout.");
        }

        try {
            await kafkaClient.initConsumer();
        }
        catch (err) {
            expect(err.message).toBe("kafka consumer connection timeout.");
        }

        expect((<any>kafkaClient).consumer.isConnected).toHaveBeenCalledTimes(1);
        expect((<any>kafkaClient).consumer.connect).toBeCalledTimes(1);
        expect(kafkaClient.producer.isConnected).toHaveBeenCalledTimes(1);
        expect(kafkaClient.producer.connect).toBeCalledTimes(1);

        done();

    });

    test('kafkaClient should disconnect producer and consumer in finalize', async done => {

        (<any>kafkaClient).consumer.isConnected = jest.fn().mockReturnValueOnce(true);
        kafkaClient.producer.isConnected = jest.fn().mockReturnValueOnce(true);
        kafkaClient.producer.disconnect = jest.fn().mockImplementationOnce(() => { });
        (<any>kafkaClient).consumer.disconnect = jest.fn().mockImplementationOnce(() => { });

        await kafkaClient.finalize();

        expect((<any>kafkaClient).consumer.isConnected).toBeCalledTimes(1);
        expect((<any>kafkaClient).consumer.disconnect).toBeCalledTimes(1);
        expect(kafkaClient.producer.isConnected).toBeCalledTimes(1);
        expect(kafkaClient.producer.disconnect).toBeCalledTimes(1);

        done();

    });

    test('kafkaClient should do nothing if producer and consumer not connected in finalize', async done => {

        (<any>kafkaClient).consumer.isConnected = jest.fn().mockReturnValueOnce(false);
        kafkaClient.producer.isConnected = jest.fn().mockReturnValueOnce(false);
        kafkaClient.producer.disconnect = jest.fn().mockImplementationOnce(() => { });
        (<any>kafkaClient).consumer.disconnect = jest.fn().mockImplementationOnce(() => { });

        await kafkaClient.finalize();

        expect((<any>kafkaClient).consumer.isConnected).toBeCalledTimes(1);
        expect((<any>kafkaClient).consumer.disconnect).toBeCalledTimes(0);
        expect(kafkaClient.producer.isConnected).toBeCalledTimes(1);
        expect(kafkaClient.producer.disconnect).toBeCalledTimes(0);

        done();

    });

    test('kafkaClient should do nothing if producer and consumer is null in finalize', async done => {

        jest.spyOn(<any>kafkaClient, 'consumer', 'get').mockReturnValueOnce(undefined);
        jest.spyOn(kafkaClient, 'producer', 'get').mockReturnValueOnce(undefined);

        await kafkaClient.finalize();

        expect(jest.spyOn(<any>kafkaClient, 'consumer', 'get')).toBeCalledTimes(1);
        expect(jest.spyOn(kafkaClient, 'producer', 'get')).toBeCalledTimes(1);

        done();

    });

});