import { Config } from "./IConfig";
import { injectable, inject } from "inversify";


export const Environment = {
    "production": "production",
    "development": "development"
}

export const RuntimeMode = {
    "INTEGRATION": "INTEGRATION",
    "UNIT_TEST": "UNIT_TEST"
}


@injectable()
export class EnvironmentConfig extends Config {
    constructor() {

        super();

        this._NODE_ENV = process.env.NODE_ENV;
        this._NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		this._RUNTIME_MODE=process.env.RUNTIME_MODE;

        this.validate();

    }

    private _NODE_ENV: string;
    public get NODE_ENV(): string {
        return this._NODE_ENV;
    }

    private _NODE_TLS_REJECT_UNAUTHORIZED: string;
    public get NODE_TLS_REJECT_UNAUTHORIZED(): string {
        return this._NODE_TLS_REJECT_UNAUTHORIZED;
    }

	private _RUNTIME_MODE:string;
	public get RUNTIME_MODE(): string {
		return this._RUNTIME_MODE;
	}

}