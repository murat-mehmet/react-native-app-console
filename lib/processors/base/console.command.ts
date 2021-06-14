import {CommandProcessParameters} from "../../console.service";

export abstract class ConsoleCommand {
    command: string;
    description: string;

    abstract process(parameters: CommandProcessParameters);

    async prepare() {

    };

}

