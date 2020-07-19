import {  DBDATATYPE, dbCmdLogTableName } from '../decorators';
import { injectable } from '../container';


@injectable()
export abstract class CmdLog {
    key: string;
    timestamp?: number;
}
