import "reflect-metadata";

const METADATAKEY = {
    dbNotCol: "db:NotCol",
    dbTableName: "db:TableName",
    dbDataType: "db:DataType",
};

export const DBDATATYPE = {
    timestamp: "timestamp",
}

export function dbCmdLogTableName(topic: string, version: number): ClassDecorator {
    return (target: object) => Reflect.defineMetadata(METADATAKEY.dbTableName, `"command.logs"."${topic}.${version}"`, target);
}

export function dbTableName(name: string): ClassDecorator {
    return (target: object) => Reflect.defineMetadata(METADATAKEY.dbTableName, name, target);
}

export function getDbTableName(target: any): string {
    let result = Reflect.getMetadata(METADATAKEY.dbTableName, target);
    return result;
}

export function dbNotCol() {
    return Reflect.metadata(METADATAKEY.dbNotCol, false);
}

export function isDbCol(target: any, propertyKey: string) {
    return !(Reflect.getMetadata(METADATAKEY.dbNotCol, target, propertyKey) === false);
}