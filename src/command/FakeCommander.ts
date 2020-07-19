import { ICommander } from './Commander';
import { ITopic } from './ITopic';
import { injectable } from '../container';


@injectable()
export class FakeCommander implements ICommander {
    sendMessage = async (message: any, replicaVersions?: number[]) => {
        return 100;
    };
    topic: ITopic = {
        topic: "create.user",
        version: 0
    };
}
