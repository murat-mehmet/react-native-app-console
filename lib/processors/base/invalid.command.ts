import _ from "lodash";
import {CommandProcessParameters} from "../../console.service";
import {ConsoleCommand} from "./console.command";

export class InvalidCommand extends ConsoleCommand {
    process({log, arg}: CommandProcessParameters) {
        log(`No command found with name "${_.escape(arg)}". Type "help" to list all possible commands.`);
    }

}
