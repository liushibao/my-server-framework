import { injectable, inject } from "inversify";
import { LoggerConfig } from '../configs';
import { IOC_TYPES } from '../IOC_TYPES';


export const logLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NEVER: 100,
}


@injectable()
export class Logger {

    constructor(@inject(IOC_TYPES.LoggerConfig) private loggerConfig:LoggerConfig){

    }

    private log(obj: string | object, level: number = 1) {

        let minimumLevel = this.loggerConfig.LOG_LEVEL ? logLevel[this.loggerConfig.LOG_LEVEL] : logLevel.INFO;
        if (level >= minimumLevel)
            console.log({
                time: new Date(),
                level: level,
                obj: obj
            });

    }

    debug(obj: string | object) {
        this.log(obj, logLevel.DEBUG);
    }

    info(obj: string | object) {
        this.log(obj, logLevel.INFO);
    }

    warn(obj: string | object) {
        this.log(obj, logLevel.WARN);
    }


    error(obj: string | object) {
        this.log(obj, logLevel.ERROR);
    }
}