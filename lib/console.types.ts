import {ConsoleCommand} from "./processors/base/console.command";

export interface SessionObject {
    logs: string,
    running: boolean,
    readLineCallback?: (input: string) => any,
    readLineOpts?: ReadLineOptions,
    cancel?: boolean;
    onCancel?: () => any;
}

export interface ReadLineOptions {
    secure?: boolean,
    select?: string[] | string[][]
}

export interface ReadArgMap {
    title: string
    expect?: RegExp | 'email'
    expectDesc?: string
    opts?: ReadLineOptions
    then?: (input) => ReadArgMap[] | Promise<ReadArgMap[]>
    default?: string
}

export interface ReadArgOptions {
    confirm: boolean | {
        skipTable?: boolean
        title?: string
    }
}

export interface ConsoleOptions {
    name?: string,
    inject?: any
    commands?: Type<ConsoleCommand>[]
    logs?: LogsOptions
    activation?: ActivationOptions
}

export interface LogsOptions {
    onListen?: () => any
}

export interface ActivationOptions {
    phrase?: string
}

export const DEFAULT_OPTIONS: ConsoleOptions = {
    name: 'React Native App',
    activation: {
        phrase: '0'.repeat(7)
    },
    commands: []
}

export interface Type<T = any> extends Function {
    new(...args: any[]): T;
}
