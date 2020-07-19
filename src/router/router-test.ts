import express from "express";
import { IHttpServer } from '../server';
import { AppRouter } from '.';
import cookieParser from "cookie-parser";
import { IAppModule } from "../IAppModule";


export abstract class AppRouterTest<T extends AppRouter> {

    constructor(private routerName: string, private testTypeIdentifier: string, private testModuleType: new (...args: any[]) => IAppModule, ...args: any[]) {
    }


    async initServer() {

        let testMoudle = await new this.testModuleType().create();

        let server = (await testMoudle.container).get<IHttpServer>(this.testTypeIdentifier);
        let app = server.app;
        let router: T = server[this.routerName];

        return { server, app, router };

    }


    initMethodTest = async () => {

        let { server, app, router } = await this.initServer();

        let req, res, next: any;

        req = {
            body: {},
            cookies: {},
            headers: {}
        };
        res = { locals: {}, };
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.cookie = jest.fn().mockReturnValue(res);
        next = jest.fn().mockImplementation(() => { });

        return { req, res, next, server, app, router };

    };


    initMiddlewareTest = async () => {

        return await this.initMethodTest();

    };


    /**
     * test router with middleware mocks
     * CAUTIONS: will mock all middleware as async (req, res, next) => next(); if arg for middlewares null or undefined.
     * @param middlewares key:value paires, example: {
            _throttleIpWrongSessionChallengeMiddleware: jest.fn().mockImplementation(async (req, res, next) => { next() }),
            _requireSessionMiddleware: jest.fn().mockImplementation(async (req, res, next) => { next() }),
            _verifySessionChallengeMiddleware: jest.fn().mockImplementation(async (req, res, next) => { return res.json({ captchaed: true }); }),
            _ipWrongSessionChallengeCouterUpdaterMiddleware: jest.fn().mockImplementation(async (req, res, next) => { }),
        }
     * once the app mounted the middlewares, there is no way to mock them, so have to recreate app and router. even app.use() remount the router dose not work, if not recreate the app and router.
    */
    initRouterTest = async (middlewares?) => {

        let { server, app, router } = await this.initServer();

        app.use(server.httpLogger)
            .use(cookieParser())
            .use(express.json())
            .use(express.urlencoded({ extended: false }));

        if (middlewares) {
            Object.entries(middlewares).forEach(t => {
                router[t[0]] = t[1];
            });
        }
        else {
            Object.entries(router).filter(t => t[0].endsWith("Middleware") && t[0] != "logErrorMiddleware" && t[0] != "handleErrorMiddleware").forEach(
                t => {
                    router[t[0]] = jest.fn().mockImplementationOnce(async (req, res, next) => next());
                }
            )
        }

        app.use("/", router.setup());


        app.use(server.logErrorMiddleware);
        app.use(server.handleErrorMiddleware);

        return { server, app, router };

    };


    abstract doTest = () => { };

}
