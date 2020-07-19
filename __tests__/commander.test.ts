import "reflect-metadata";
import path from 'path'
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../dist/.env") });

import { MetadataOptions, LibrdKafkaError, Metadata, NumberNullUndefined, MessageHeader } from 'node-rdkafka';

import { Uuid } from '../src/uuid/uuid';

import { FakeCommander, Commander, ICommander, IOC_TYPES, KfkConfig, LoggerConfig, Logger } from '../src'
import { DefaultLoggerClient } from '../src/command/LoggerClient';
import { inject, Container, injectable } from "inversify";

let kfkConfig: KfkConfig;
let kafkaClient: DefaultLoggerClient;
let container: Container;

beforeAll(async done => {

    container = new Container();
    container.bind<KfkConfig>(IOC_TYPES.KfkConfig).to(KfkConfig).inSingletonScope();
    container.bind<LoggerConfig>(IOC_TYPES.LoggerConfig).to(LoggerConfig);
    container.bind<Logger>(IOC_TYPES.Logger).to(Logger);
    kfkConfig = container.get<KfkConfig>(IOC_TYPES.KfkConfig);
    jest.spyOn(kfkConfig, 'KFK_METADATAOPTIONS_TIMEOUT', 'get').mockReturnValue(1000);
    jest.setTimeout(kfkConfig.KFK_METADATAOPTIONS_TIMEOUT * 2 + 1000);
    container.bind<DefaultLoggerClient>(IOC_TYPES.ILoggerClient).to(DefaultLoggerClient);
    kafkaClient = container.get<DefaultLoggerClient>(IOC_TYPES.ILoggerClient);

    (<any>kafkaClient).consumer.subscribe = jest.fn().mockImplementation((topics)=>{});

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

    let producerConnected = await kafkaClient.initProducer();
    let consumerConnected = await kafkaClient.initConsumer();

    done();

});

afterAll(async done => {
    done();
});


describe("FakeCommandProducer", () => {

    test("should return mock value 100 on produce", async done => {

        let result = await new FakeCommander().sendMessage({ name: "bob" });
        expect(result).toBe(100);
        done();

    });

});


// @injectable()
// class TestCommandProducer extends Commander {

//     constructor(
//         // protected topic: string,
//         // protected version: number,
//         @inject(FRAMEWORK_TYPES.KfkConfig) protected kfkConfig: KfkConfig,
//         @inject(FRAMEWORK_TYPES.DefaultLoggerClient) protected loggerClient: DefaultLoggerClient
//     ) {
//         super("unit.test", 0, kfkConfig, loggerClient);
//     }

// }


describe("CommandProducer", () => {

    test("should send object message with right args", async () => {
        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        let mockKFK_PREFIX = jest.spyOn(kfkConfig, 'KFK_PREFIX', 'get').mockReturnValueOnce("dev");
        // container.bind<string>(IOC_TYPES.CommanderTopic).toConstantValue("unit.test");
        // container.bind<number>(IOC_TYPES.CommanderVersion).toConstantValue(1);
        container.bind<Commander>("TestCommander").to(Commander);
        let commandProducer = container.get<Commander>("TestCommander");
        commandProducer.topic={topic:"unit.test",version:1};
        (<any>commandProducer).producer.produce = jest.fn().mockImplementationOnce(
            (topic: string, partition: NumberNullUndefined, message: any, key: any, timestamp: NumberNullUndefined, callback: (err: any, offset?: NumberNullUndefined) => void) => {
                callback(undefined, 100);
            }
        );
        let result = await commandProducer.sendMessage({ name: "bob" });
        expect((<any>commandProducer).producer.produce).toBeCalledTimes(1);
        expect(mockKFK_PREFIX).toBeCalledTimes(1);
        expect((<any>commandProducer).producer.produce.mock.calls[0][0]).toBe("dev.unit.test.1");
        expect((<any>commandProducer).producer.produce.mock.calls[0][3]).toBe('fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect(JSON.parse((<any>commandProducer).producer.produce.mock.calls[0][2].toString()).name).toBe('bob');
        expect(result).toBe(100);
    });

    test("should send string message with right args", async () => {
        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        let mockKFK_PREFIX = jest.spyOn(kfkConfig, 'KFK_PREFIX', 'get').mockReturnValueOnce("dev");
        // container.rebind<string>(IOC_TYPES.CommanderTopic).toConstantValue("unit.test");
        // container.rebind<number>(IOC_TYPES.CommanderVersion).toConstantValue(0);
        container.bind<Commander>("TestCommander2").to(Commander);
        let commandProducer = container.get<Commander>("TestCommander2");
        commandProducer.topic={topic:"unit.test",version:0};
        (<any>commandProducer).producer.produce = jest.fn().mockImplementationOnce(
            (topic: string, partition: NumberNullUndefined, message: any, key: any, timestamp: NumberNullUndefined, callback: (err: any, offset?: NumberNullUndefined) => void) => {
                callback(undefined, 100);
            }
        );
        let result = await commandProducer.sendMessage("bob");
        expect((<any>commandProducer).producer.produce).toBeCalledTimes(1);
        expect(mockKFK_PREFIX).toBeCalled();
        expect((<any>commandProducer).producer.produce.mock.calls[0][0]).toBe("dev.unit.test.0");
        expect((<any>commandProducer).producer.produce.mock.calls[0][3]).toBe('fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect((<any>commandProducer).producer.produce.mock.calls[0][2].toString()).toBe('bob');
        expect(result).toBe(100);
    });

    test("should send buffer message with right args", async () => {
        let msg = Buffer.from("bob");
        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        let mockKFK_PREFIX = jest.spyOn(kfkConfig, 'KFK_PREFIX', 'get').mockReturnValueOnce("dev");
        let commandProducer = new Commander(kfkConfig, kafkaClient);
        commandProducer.topic={topic:"unit.test",version:0};
        (<any>commandProducer).producer.produce = jest.fn().mockImplementationOnce(
            (topic: string, partition: NumberNullUndefined, message: any, key: any, timestamp: NumberNullUndefined, callback: (err: any, offset?: NumberNullUndefined) => void) => {
                callback(undefined, 100);
            }
        );
        let result = await commandProducer.sendMessage(msg);
        expect((<any>commandProducer).producer.produce).toBeCalledTimes(1);
        expect(mockKFK_PREFIX).toBeCalled();
        expect((<any>commandProducer).producer.produce.mock.calls[0][0]).toBe("dev.unit.test.0");
        expect((<any>commandProducer).producer.produce.mock.calls[0][3]).toBe('fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect(Buffer.isBuffer((<any>commandProducer).producer.produce.mock.calls[0][2])).toBe(true);
        expect(result).toBe(100);
    });

    test("should send buffer message with right args to current and obsolet topics", async () => {
        let msg = Buffer.from("bob");
        Uuid.v4 = jest.fn().mockReturnValueOnce('fec12a66-47e1-4d25-9acd-fe851d24575c');
        let mockKFK_PREFIX = jest.spyOn(kfkConfig, 'KFK_PREFIX', 'get').mockReturnValueOnce("dev");
        let commandProducer = new Commander(kfkConfig, kafkaClient);
        commandProducer.topic={topic:"unit.test",version:0};
        // let commandProducer = new Commander(, 0);
        (<any>commandProducer).producer.produce = jest.fn()
            .mockImplementationOnce(
                (topic: string, partition: NumberNullUndefined, message: any, key: any, timestamp: NumberNullUndefined, heders: MessageHeader[], callback: (err: any, offset?: NumberNullUndefined) => void) => {
                    callback(undefined, 100);
                }
            )
            .mockImplementationOnce(
                (topic: string, partition: NumberNullUndefined, message: any, key: any, timestamp: NumberNullUndefined, callback: (err: any, offset?: NumberNullUndefined) => void) => {
                    callback(undefined, 100);
                }
            );
        let result = await commandProducer.sendMessage(msg, [-1]);
        expect((<any>commandProducer).producer.produce).toBeCalledTimes(2);
        expect(mockKFK_PREFIX).toBeCalled();
        expect((<any>commandProducer).producer.produce.mock.calls[0][0]).toBe("dev.unit.test.-1");
        expect((<any>commandProducer).producer.produce.mock.calls[1][0]).toBe("dev.unit.test.0");
        expect((<any>commandProducer).producer.produce.mock.calls[0][3]).toBe('fec12a66-47e1-4d25-9acd-fe851d24575c');
        expect(Buffer.isBuffer((<any>commandProducer).producer.produce.mock.calls[0][2])).toBe(true);
        expect(result).toBe(100);
    });

});