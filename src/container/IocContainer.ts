import { Container } from 'inversify';
import {  inject, interfaces } from './Inversify';
import { ContainerError } from '../errors';

export class IocContainer {

    constructor(containerOptions: interfaces.ContainerOptions = { autoBindInjectable: true, skipBaseClassChecks: true }) {
        this._container = new Container(containerOptions);
    }

    private _container: Container;
    private get container(): Container {
        return this._container;
    }

    bind<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>, autoRebind: boolean = true): interfaces.BindingToSyntax<T> {

        if (!autoRebind && this.container.isBound(serviceIdentifier))
            throw new ContainerError(`identifier already bind: ${serviceIdentifier.toString()}`);
        else if (autoRebind && this.container.isBound(serviceIdentifier)) {
            this.container.unbind(serviceIdentifier);
            return this.container.rebind<T>(serviceIdentifier);
        }
        else
            return this.container.bind<T>(serviceIdentifier);
    }

    get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
        return this.container.get<T>(serviceIdentifier);
    }

    

}