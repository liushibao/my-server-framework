import { PoolClient, Pool } from 'pg';
import { Logger } from '../logger';
import { RepositoryError, errorSererity } from '../errors';
import { isDbCol, getDbTableName } from '../decorators/db.decorators';
import { type } from 'os';
import { injectable, inject, interfaces } from '../container';
import { IOC_TYPES } from '../IOC_TYPES';


@injectable()
/** 
 * (1) should release dbClient in the caller when arg is PoolClient 
 * (2) timestamp === null is not supported, timestamp === undefined is ok
 **/
export class Repository<T> {

    constructor(
        // @inject(FRAMEWORK_TYPES.Newable_EntityType) private entityType: interfaces.Newable<T>,
        private entityType: new () => T
    ) {
    }


    private _table: string;
    get table(): string {
        if (!this._table)
            this._table = getDbTableName(this.entityType);
        return this._table;
    }

    /**
     * return a where included condition clause, if cons entries length bigger than 0
     * @param cons query conditions, object: key-value object, example: {id:id}
     */
    _formWhereAndStr = (cons: any, offset: number = 0) => {
        let whereStr = cons && Object.keys(cons).length > 0 ? `where ${Object.keys(cons).map((t, i) => `"${t}"=$${i + offset + 1}`).join(" and ")}` : '';
        return whereStr;
    };

    /**
     * return an arguments array from the cons' values, example output [123,'myname'], if cons entries length bigger than 0
     * @param cons query conditions, key-value object, example: {id:123, name:'myname'}
     */
    _formArgsArray = (cons: any) => {
        let argsArray = cons && Object.values(cons).length > 0 ? Object.entries(cons).filter(t => isDbCol(this.entityType.prototype, t[0])).map(t => t[1]) : null;
        return argsArray;
    };

    /**
     * return postgresql parameters placeholder string, example output '$1,$2', if values entries length bigger than 0
     * @param values query conditions, object: key-value object, example: {id:123, name:'myname'}
     */
    _formValuesPlaceholderStr = (values: any) => {
        let keys = values ? Object.keys(values).filter(t => isDbCol(this.entityType.prototype, t)) : [];
        let valuesStr = values && keys.length > 0 ? keys.map((t, i) => `$${i + 1}`).join(",") : '';
        return valuesStr;
    };

    executeRaw = async (dbClient: PoolClient | Pool, sqlStr: string, args?: any[]) => {

        let result = await dbClient.query(sqlStr, args);
        return result;

    };

    selectRaw = async <T>(dbClient: PoolClient | Pool, sqlStr: string, args?: any[]) => {

        let results = (await dbClient.query(sqlStr, args)).rows;
        return <T[]>results;

    };

    /**
     * null is not converted to empty string in sql statement, so use single quote instead of
     * @cons query conditions, object: key-value object, example: {id:id}
     * @colsExcl not used now
     */
    select = async <T>(dbClient: PoolClient | Pool, cons: any, cols?: string[], colsExcl?: string[], skip?: number, take?: number) => {
        // cols = cols.filter(t => !colsExcl.includes(t));
        let consStr = cons ? this._formWhereAndStr(cons) : '';
        let consArgs = cons ? this._formArgsArray(cons) : null;
        let colsStr = cols ? cols.join(",") : "*";
        let skipStr = skip ? `offset ${skip}` : '';
        let takeStr = take ? `limit ${take}` : '';
        let sqlStr = `select ${colsStr} from ${this.table} ${consStr} ${skipStr} ${takeStr}`;
        let results = (await dbClient.query(sqlStr, consArgs)).rows;
        return <T[]>results;

    };

    _formWhereOrStr(col: string, args: any[]) {
        let whereStr = col && args && args.length > 0 ? `where ${args.map((t, i) => `"${col}"=$${i + 1}`).join(" or ")}` : '';
        return whereStr;
    }

    selectBatch = async <T>(dbClient: PoolClient | Pool, col: string, args: any[]/*, cols?: string[], colsExcl?: string[], skip?: number, take?: number*/) => {

        let consStr = col && args ? this._formWhereOrStr(col, args) : '';
        let colsStr = "*";// cols ? cols.join(",") : "*";
        let skipStr = "";// skip ? `offset ${skip}` : '';
        let takeStr = "";// take ? `limit ${take}` : '';
        let sqlStr = `select ${colsStr} from ${this.table} ${consStr} ${skipStr} ${takeStr}`;

        let results = await this.selectRaw<T>(dbClient, sqlStr, args);
        return results;

    };

    singleOrDefault = async <T>(dbClient: PoolClient | Pool, cons: any, cols?: string[], colsExcl?: string[]) => {

        let results = await this.select(dbClient, cons, cols, colsExcl);

        if (results.length > 1)
            throw new RepositoryError("multiple record found", "MULTIPLE_RECORD_FOUND", errorSererity.MAJOR);
        else if (results.length == 0)
            return null;
        else
            return <T>(results[0]);

    };

    firstOrDefault = async <T>(dbClient: PoolClient | Pool, cons: any, cols?: string[], colsExcl?: string[]) => {

        let results = await this.select(dbClient, cons, cols, colsExcl);

        if (results.length == 0)
            return null;
        else
            return <T>(results[0]);

    };

    remove = async (dbClient: PoolClient | Pool, cons: any) => {

        if (!cons || (typeof cons == 'object' && Object.entries(cons).length <= 0))
            throw new RepositoryError("conditions must be supplied in a delete command", "CONDITIONS_MUST_BE_SUPPLIED_IN_A_DELETE_COMMAND", errorSererity.MAJOR);

        let consStr = this._formWhereAndStr(cons);
        let consArgs = this._formArgsArray(cons);
        let sqlStr = `delete from ${this.table} ${consStr}`;
        return await dbClient.query(sqlStr, consArgs);

    };

    add = async (dbClient: PoolClient | Pool, entity: any) => {

        let entries = Object.entries(entity).filter(t => isDbCol(this.entityType.prototype, t[0]));
        let entityColsStr = entries.map(t => `"${t[0]}"`).join(",");
        let entityValus = entries.map(t => t[1]);
        let entityParamPlaceholdersStr = this._formValuesPlaceholderStr(entity);
        let sql = `insert into ${this.table} (${entityColsStr}) values (${entityParamPlaceholdersStr})`;
        return await dbClient.query(sql, entityValus);

    };

    /**
     * 
     * @param entities every entity should define the same set of properties. // TODO add check and test for this requirement
     */
    async addBatch(dbClient: PoolClient | Pool, entities: any[]) {

        if (entities.length < 1)
            throw new RepositoryError("entity not found.", "ENTITY_NOT_FOUND", errorSererity.MAJOR);

        let entityColsStr;
        let propertties = Object.keys(entities[0]).filter(t => isDbCol(this.entityType.prototype, t));
        let entityParamPlaceholdersStr = Array(entities.length).fill(0).map((x, j) => "(" + propertties.map((t, i) => `$${propertties.length * j + i + 1}`).join(",") + ")").join(",");
        let entityValus: any[] = [];
        entities.forEach(entity => {
            if (!entityColsStr) {
                let entries = Object.entries(entity).filter(t => isDbCol(this.entityType.prototype, t[0]));
                entityColsStr = entries.map(t => `"${t[0]}"`).join(",");
            }
            entityValus.push(Object.entries(entity).filter(t => isDbCol(this.entityType.prototype, t[0])).map(t => t[1]));
        })
        let sql = `insert into ${this.table} (${entityColsStr}) values ${entityParamPlaceholdersStr}`;
        return await dbClient.query(sql, (<any>entityValus).flat());

    };

    patch = async (dbClient: PoolClient | Pool, cons: any, patchObj: any) => {

        if (!cons || (typeof cons == 'object' && Object.entries(cons).length <= 0))
            throw new RepositoryError("conditions must be supplied in a patch command", "CONDITIONS_MUST_BE_SUPPLIED_IN_A_PATCH_COMMAND", errorSererity.MAJOR);

        let keys = Object.keys(patchObj);
        keys.forEach(t => {
            if (!isDbCol(this.entityType.prototype, t))
                delete patchObj[t];
        })

        let setStr = `${Object.keys(patchObj).map((t, i) => `"${t}"=$${i + 1}`).join(", ")}`;
        let setArgs = this._formArgsArray(patchObj);
        let consStr = this._formWhereAndStr(cons, Object.keys(patchObj).length);
        let consArgs = this._formArgsArray(cons);
        let sqlStr = `update ${this.table} set ${setStr} ${consStr}`;
        return await this.executeRaw(dbClient, sqlStr, [...setArgs, ...consArgs]);

    };

}
