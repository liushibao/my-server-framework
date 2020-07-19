import { Pool, PoolClient } from 'pg';
import { IService } from './service';
import { CmdLog } from '../entities';
import { Message } from 'node-rdkafka';
import { Repository } from '../repository';


export class ExecutorDbService implements IService {

    constructor(
        protected dbPool: Pool) {
    }

    finalize(): Promise<void> {
        return this.dbPool.end();
    }


    async transaction(cb: (dbClient: PoolClient) => Promise<void>) {
        let dbClient = await this.dbPool.connect();
        try {
            dbClient.query('BEGIN');
            await cb(dbClient);
            dbClient.query('COMMIT');
        }
        catch (err) {
            dbClient.query('ROLLBACK');
            throw err;
        }
        finally {
            dbClient.release();
        }
    }

    protected async addBatchCmdLogs<T extends CmdLog>(msgs: Message[], cmdLogRepository: Repository<T>, dbClient: PoolClient) {

        let cmdLogs = msgs.map(t => { return { key: t.key.toString(), timestamp: new Date(t.timestamp) }; });
        await cmdLogRepository.addBatch(dbClient, cmdLogs);
    }

    /**
     * (1) filter out process messages and return msgs to cbs
     * (2) call cbs to process business logic
     * (3) this method will call this.addBatchCmdLogs after cbs called
     * (4) only cbBiz succeded will be the cbCache called, and cbCache will be silent if fails
     * @param cb business logic for updating database should go here
     */
    handleCommand = async <T extends CmdLog>(messages: Message[], cmdLogRepository: Repository<T>, cb: (msgs: Message[], dbClient: PoolClient) => Promise<void>) => {

        let msgs: Message[];

        await this.transaction(async (dbClient) => {

            let processedCmdLogs = await cmdLogRepository.selectBatch<T>(dbClient, "key", []);
            msgs = messages.filter(t => processedCmdLogs.findIndex(x => x.key == t.key) < 0)

            if (msgs.length > 0) {
                await cb(msgs, dbClient);
                await this.addBatchCmdLogs<T>(msgs, cmdLogRepository, dbClient);
            }

        });

    }

}



