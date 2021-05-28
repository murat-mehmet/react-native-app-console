import {CommandProcessParameters} from "../console.service";
import {ConsoleCommand} from "./base/console.command";

export class ClearScreenCommand extends ConsoleCommand {
    constructor() {
        super();
        this.command = 'clr';
        this.description = 'Clears screen'
    }

    async process({session}: CommandProcessParameters) {
        session.logs = '';
    }

}
