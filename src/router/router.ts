import { injectable } from '../container';
import express, { Router } from 'express';
import { Request, Response, NextFunction } from "express";
import url from "url";
import request from "sync-request";
import querystring from 'querystring';

import { Logger } from "../logger"
import { Cache } from "../cache/cache"
import { ServerConfig, LoggerConfig } from "../configs"
import { UnauthorizedError, errorSererity, AccessDeniedError, BadRequestError, ServiceError, ServerError } from '../errors';

@injectable()
export abstract class AppRouter {

    constructor(
        readonly serverConfig: ServerConfig,
        readonly logger: Logger,
        readonly accessTokenCache: Cache) {
    }

    // properties

    router: Router = express.Router();


    // used only when api-client server referenced this class
    private _client_access_token: string = null;
    /* istanbul ignore next */
    public get api_client_access_token(): string {
        return this._client_access_token;
    }
    /* istanbul ignore next */
    public set api_client_access_token(value: string) {
        this._client_access_token = value;
    }

    private _client_scope: string = null;
    /* istanbul ignore next */
    public get api_client_scope(): string {
        return this._client_scope;
    }
    /* istanbul ignore next */
    public set api_client_scope(value: string) {
        this._client_scope = value;
    }

    // used only when resource server referenced this class
    private _allowedClients: string[] = [];
    /* istanbul ignore next */
    public get allowedClients(): string[] {
        return this._allowedClients;
    }
    /* istanbul ignore next */
    public set allowedClients(value: string[]) {
        this._allowedClients = value;
    }


    // Methods

    abstract setup(): Router;

    // encodeClientCredentials = function (clientId, clientSecret) {
    //     return new Buffer(querystring.escape(clientId) + ':' + querystring.escape(clientSecret)).toString('base64');
    // };

    buildUrl = (base, options) => {
        let newUrl = url.parse(base, true);
        delete newUrl.search;
        if (options)
            Object.entries(options).forEach((value) => newUrl.query[value[0]] = <string>value[1]);

        return url.format(newUrl);
    }


    // MiddlewaredleWares

    setNoCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
        res.set('Pragma', 'no-cache');
        res.set('Cache-Control', 'no-cache, no-store');
        return next();
    }

    getAccessTokenObjFromCacheMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        // check the auth header first
        let auth = req.headers['authorization'];
        let inToken = null;
        if (auth && auth.toLowerCase().indexOf('bearer') == 0) {
            inToken = auth.slice('bearer '.length);
        }
        //  else if (req.body && req.body.access_token) {
        //      // not supported
        //     // not in the header, check in the form body
        //     inToken = req.body.access_token;
        // }
        // else if (req.query && req.query.access_token) {
        // // not supported
        //     inToken = req.query.access_token
        // }

        this.logger.debug(`Incoming token: ${inToken}`);

        if (!inToken) {
            return next();
        }

        res.locals.inToken = inToken;

        let token = await this.accessTokenCache.getObj(inToken);

        if (token) {
            this.logger.debug(`We found a matching token: ${inToken}`);
            res.locals.access_token_obj = token;
        } else {
            this.logger.debug('No matching token was found.');
        }

        return next();

    };

    requireAccessTokenObjMiddleware = (req: Request, res: Response, next: NextFunction) => {
        if (!res.locals.inToken)
            return next(new UnauthorizedError("missing access token", "MISSING_ACCESS_TOKEN", errorSererity.MINOR, 401));

        let token_obj = res.locals.access_token_obj;
        if (token_obj) {
            if (this.allowedClients.length > 0 && !this.allowedClients.find(t => t == token_obj.client_id))
                return next(new AccessDeniedError("client not allowed to access this resource", "CLIENT_NOT_ALLOWED_TO_ACCESS_THIS_RESOURCE", errorSererity.MINOR, 401));
            return next();
        } else {
            return next(new UnauthorizedError("access token not found", "ACCESS_TOKEN_NOT_FOUND", errorSererity.MINOR, 401));
        }
    };

    permittedRoles = (roles: any[]) => {
        return (req, res, next) => {
            if ((<any[]>res.locals.access_token_obj.user.roles).some(t => roles.find(x => x == t)))
                next();
            else
                next(new AccessDeniedError("没有相关API权限。"));
        }
    }

    /* istanbul ignore next */
    // TODO ... test
    /**
     * Caution !!! this.middleware is not tested yet.
     */
    requestApiClientAccessTokenFromAuthServerMiddleware = (req: Request, res: Response, next: NextFunction) => {

        let client = res.locals.client;

        if (!this.api_client_access_token) {

            let form_data = JSON.stringify({
                grant_type: 'client_credentials',
                client_id: client.client_id,//
                client_secret: client.client_secret//
            });

            let headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                // 'Authorization': 'Basic ' + this.encodeClientCredentials(client.client_id, client.client_secret)
            };

            let tokRes = request('POST', this.serverConfig.authEndpoints.tokenEndpoint,
                {
                    body: form_data,
                    headers: headers
                }
            );

            this.logger.debug('Requesting access token');

            if (tokRes.statusCode >= 200 && tokRes.statusCode < 300) {
                let body = JSON.parse(tokRes.getBody());

                this.api_client_access_token = body.access_token;
                this.logger.debug(`Got access token: ${this.api_client_access_token}`);

                this.api_client_scope = body.scope;
                this.logger.debug(`Got scope: ${this.api_client_scope}`);
            } else if (tokRes.statusCode >= 400 && tokRes.statusCode < 500) {
                return next(new BadRequestError("Unable to get api client access token from the auth server", "REQUEST_API_CLIENT_TOKEN_FAILED", errorSererity.MINOR, tokRes.statusCode));
            } else {
                return next(new ServerError("Unable to get api client access token from the auth server", "REQUEST_API_CLIENT_TOKEN_FAILED", errorSererity.MINOR, tokRes.statusCode));
            }
        }

        res.locals.api_client_access_token = this.api_client_access_token;
        res.locals.api_client_scope = this.api_client_scope;

        next();
    }

}