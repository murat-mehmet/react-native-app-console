import {CommandProcessParameters, ConsoleService} from "../console.service";
import {ConsoleCommand} from "./base/console.command";

export class EchoCommand extends ConsoleCommand {
    constructor(readonly injected: {consoleService: ConsoleService}) {
        super();
        this.command = 'echo';
        this.description = 'Displays messages'
    }

    async process({arg, log}: CommandProcessParameters) {
        log(arg);
    }
}
