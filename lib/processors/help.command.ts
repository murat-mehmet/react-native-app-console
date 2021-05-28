import {CommandProcessParameters, ConsoleService} from "../console.service";
import {ConsoleCommand} from "./base/console.command";

export class HelpCommand extends ConsoleCommand {
    constructor(readonly injected: {consoleService: ConsoleService}) {
        super();
        this.command = 'help';
        this.description = 'Lists all commands'
    }

    async process({logTable}: CommandProcessParameters) {
        const {consoleService} = this.injected;
        const entities = consoleService.allCommands.map(x => ({
            Command: x.command,
            Description: x.description
        }));
        logTable(entities)
    }

}
