import https from 'https';
import http from 'http';
import express from 'express';
import { Request, Response, NextFunction } from "express";
import { injectable, inject } from '../container';
import morgan from "morgan";


import { Cache } from "../cache/cache"
import { Logger } from '../logger';
import { errorSererity } from '../errors';
import { LoggerConfig, ServerConfig } from '../configs';


export interface IHttpServer {
    app: any;
    httpsServer: https.Server;
    httpServer: http.Server;
    httpLogger: any;
    serverConfig: ServerConfig;
    logger: Logger;
    logErrorMiddleware: (err, req, res, next) => Promise<any>;
    handleErrorMiddleware: (err, req, res, next) => Promise<any>;
    createServer(): IHttpServer;
    configure(): Promise<IHttpServer>;
    finalize(): Promise<void>;
}


@injectable()
export abstract class HttpServer implements IHttpServer {


    constructor(
        readonly serverConfig: ServerConfig,
        readonly loggerConfig: LoggerConfig,
        readonly logger: Logger,
        readonly accessTokenCache: Cache) {
    }


    // properties

    app = express();
    httpsServer: https.Server;
    httpServer: http.Server;

    httpLogger = morgan("combined", {
        "stream": {
            write: str => this.logger.info(str)
        }
    });


    // Methods

    createServer(): IHttpServer {
        if (this.serverConfig.PROTOCOL == "HTTPS")
            this.httpsServer = https.createServer(this.serverConfig.credentials, this.app);
        if (this.serverConfig.PROTOCOL == "HTTP")
            this.httpServer = http.createServer(this.app);
        return this;
    }

    abstract async configure(): Promise<IHttpServer>;

    async finalize() {

    }


    // MiddlewaredleWares

    logErrorMiddleware = async (err, req, res, next) => {

        if (this.loggerConfig.NO_HTTP_ERROR_LOG == "1")
            return next(err);

        if (err.serverity == errorSererity.TRIVIAL)
            this.logger.error({ err });
        else
            this.logger.error({ err, req, res });

        return next(err);

    }

    handleErrorMiddleware = async (err, req, res, next) => {
        let statusCode = err.statusCode ? err.statusCode : 500;
        let errorObj = {
            errorCode: err.errorCode ? err.errorCode : "UNKNOWN_ERROR",
            errorMsg: err.message ? err.message : "未知错误。"
        };
        return res.status(statusCode).json(errorObj);
    }

}