import { ConfigError, NotFoundError } from "../errors"
import { injectable } from "inversify";

export interface IConfig {
    validate(): void;
}


@injectable()
export abstract class Config implements IConfig {

    validate(): void {
        Object.entries(this).filter(t=>!t[0].startsWith("_")).forEach(t => {
            if (!t[1] || t[1] == NaN)
                throw new ConfigError(`${t[0]} config not found.`, "CONFIG_NOT_FOUND");
        })
    }

}