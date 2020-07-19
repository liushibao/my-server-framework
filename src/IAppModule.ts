import { IocContainer } from './container';

export interface IAppModule {
    container: IocContainer;
    create(): Promise<IAppModule>;
}

export interface IRepositoryTestModule {
    dbName: string;
    container: IocContainer;
    create(): Promise<IRepositoryTestModule>;
}

export interface IServiceTestModule {
    dbName: string;
    container: IocContainer;
    create(): Promise<IServiceTestModule>;
}
