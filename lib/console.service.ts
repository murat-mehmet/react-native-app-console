import {ConsoleOptions, ReadArgMap, ReadArgOptions, ReadLineOptions, SessionObject} from "./console.types";
import {ConsoleCommand} from "./processors/base/console.command";
import {InvalidCommand} from "./processors/base/invalid.command";
import {generateTable} from "./table.tool";

export class ConsoleService {
    allCommands: ConsoleCommand[] = [];
    session: SessionObject;
    onPrepare;

    constructor(readonly consoleOptions: ConsoleOptions) {
        (async () => {
            const {COMMANDS} = await import('./all.commands');
            for (let i = 0; i < COMMANDS.ALL.length; i++) {
                let COMMAND = COMMANDS.ALL[i];
                this.allCommands.push(new COMMAND({consoleService: this, ...consoleOptions.inject}));
            }
            for (let i = 0; i < this.allCommands.length; i++) {
                let instance = this.allCommands[i];
                await instance.prepare().catch(console.warn);
            }
            this.onPrepare();
        })().catch(console.warn)
    }

    parse(commandLine: string, session: SessionObject) {
        const index = commandLine.indexOf(' ');
        let command = '', arg = '';

        session.logs += `\napp:/> ${commandLine}\n`

        try {
            if (index == -1) {
                command = commandLine;
            } else {
                command = commandLine.substring(0, index);
                arg = commandLine.substring(index + 1);
            }
        } catch (e) {
        }
        if (!command)
            return this.createInvalidCommand(commandLine, '');
        const commandObj = this.allCommands.find(x => x.command.toLowerCase() == command);
        if (!commandObj)
            return this.createInvalidCommand(commandLine, command);

        return {
            cmd: commandObj,
            arg
        };
    }

    createInvalidCommand(rawCommand: string, command: string) {
        const cmd = new InvalidCommand();
        return {cmd, arg: command};
    }

    log(session: SessionObject, text: string) {
        if (session.cancel) return;
        session.logs += text + '\n';
    }

    toTable(entities: any[] | any, noColumns?: boolean) {
        if (!entities)
            return 'Empty object';
        const isArray = Array.isArray(entities);
        if (!isArray && typeof entities != 'object')
            entities = {Result: entities};
        if (!isArray && (!entities || !Object.keys(entities).length))
            return 'Empty object';
        else if (isArray && !entities.length)
            return 'No records';
        const columns = noColumns ? [0] : Object.keys(isArray ? entities[0] : entities);
        let rows = [];
        // //add header row
        if (!noColumns) {
            let cols = [];
            for (let i = 0; i < columns.length; i++)
                cols.push(columns[i])
            rows.push(cols);
            cols = [];
            for (let i = 0; i < columns.length; i++)
                cols.push('-'.repeat(columns[i].toString().length))
            rows.push(cols);
        }
        // //add rows
        for (let i = 0; i < (isArray ? entities.length : 1); i++) {
            let cols = [];
            for (let j = 0; j < columns.length; j++)
                cols.push((noColumns ? (isArray ? entities[i] : entities) : (isArray ? entities[i][columns[j]] : entities[columns[j]]))?.toString());
            rows.push(cols);
        }
        return generateTable(rows);
    }

    readLine(session: SessionObject, title: string, opts?: ReadLineOptions) {
        return new Promise<string>((res, rej) => {
            if (session.cancel) return rej('Operation canceled');
            session.readLineOpts = opts || {};
            session.readLineOpts['title'] = title + ' ';
            session.readLineCallback = (input) => {
                if (session.cancel) return rej('Operation canceled');
                let displayInput;
                if (session.readLineOpts.secure)
                    displayInput = '*'.repeat(input.length);
                else if (session.readLineOpts.select && Array.isArray(session.readLineOpts.select[0]))
                    displayInput = (session.readLineOpts.select as string[][]).find(x => x[0] == input)[1]
                else
                    displayInput = input;
                session.logs += title + ' ' + displayInput + '\n';
                res(input);
            };
        })
    }

    parseArgs(arg: string) {
        let parsedArgs = [];
        if (arg) {
            let w = '', wqs = false;
            for (let i = 0; i < arg.length; i++) {
                if (arg[i] == '"' && (i == 0 || arg[i - 1] != '\\')) {
                    if (wqs) {
                        if (w) parsedArgs.push(w);
                        w = '';
                        wqs = false;
                    } else wqs = true;
                } else if (arg[i] == ' ' && !wqs) {
                    if (w) parsedArgs.push(w);
                    w = '';
                } else w += arg[i];
            }
            if (w) parsedArgs.push(w)
        }
        return parsedArgs;
    }

    async readArgs(session: SessionObject, arg: string, mapList: ReadArgMap[], parameters?: ReadArgOptions): Promise<string[]> {
        const {result, flatResult} = await this._readArgs(session, mapList, this.parseArgs(arg));
        if (parameters) {
            if (parameters.confirm) {
                this.log(session, parameters.confirm['title'] || 'Executing command with parameters:');
                if (!parameters.confirm['skipTable']) {
                    this.log(session, this.toTable(flatResult.reduce((o, v, i) => {
                            o[v.label.endsWith(':') ? v.label.slice(-1) : v.label] = v.text;
                            return o;
                        }, {})),
                    );
                }

                if ((await this.readLine(session, 'Confirm? [Y/N]')).toLowerCase() != 'y') {
                    throw new Error('Operation canceled')
                }
            }
        }
        return result;
    }

    getSession() {
        if (!this.session)
            this.session = {
                logs: '',
                running: false,
                readLineCallback: null,
                cancel: false,
                onCancel: null
            }
        return this.session;
    }

    private async _readArgs(session: SessionObject, mapList: ReadArgMap[], parsedArgs: string[]): Promise<{result: string[], flatResult: {label: string, text: string, input: string}[]}> {
        let result = [], flatResult = [];
        for (let i = 0; i < mapList.length; i++) {
            let map = mapList[i];
            let label = map.title, text, input;
            if (parsedArgs.length) {
                const desiredInput = parsedArgs.shift();
                if (map.opts?.select) {
                    const isArray = Array.isArray(map.opts.select[0]);
                    if (isArray) {
                        const pair = (map.opts.select as string[][]).find(x => x[1] == desiredInput);
                        if (pair)
                            input = pair[0];
                        else
                            session.logs += (`Invalid parameter "${desiredInput}". ${map.expectDesc || ''}`) + '\n';
                    } else if ((map.opts.select as string[]).includes(desiredInput))
                        input = desiredInput;
                    else
                        session.logs += (`Invalid parameter "${desiredInput}". ${map.expectDesc || ''}`) + '\n';
                } else
                    input = desiredInput;
            }
            while (true) {
                if (input == null)
                    input = await this.readLine(session, map.title + (map.default ? ` [${map.default}]` : '') + ':', map.opts);
                if (!input && map.default)
                    input = map.default
                if (!map.expect || (typeof map.expect == 'string' ? expectRegex[map.expect] : map.expect).test(input)) {
                    if (map.opts?.select?.length && Array.isArray(map.opts.select[0]))
                        text = (map.opts.select as string[][]).find(x => x[0] == input)[1];
                    else
                        text = input;
                    break;
                }
                session.logs += (`Invalid parameter "${input}". ${map.expectDesc || ''}`) + '\n';
                input = null;
            }
            flatResult.push({input, label, text})
            result.push(input);
            if (map.then) {
                const innerResult = await this._readArgs(session, await map.then(input), parsedArgs);
                result.push(innerResult.result);
                flatResult.push(...innerResult.flatResult);
            }
        }
        return {result, flatResult};
    }

    makeId = length => {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}

export interface CommandProcessParameters {
    rawCommand: string,
    arg: string;
    session: SessionObject,

    logTable(entities: any[] | any, noColumns?: boolean): any,

    log(...text: any[]): any,

    readArgs(mapList: ReadArgMap[], parameters?: ReadArgOptions): Promise<string[]>,

    readLine(title?: string, opts?: ReadLineOptions): Promise<string>,

    parseArgs(arg?: string): string[],

    toTable(entities: any[] | any, noColumns?: boolean): string
}

const expectRegex = {
    email: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
}
