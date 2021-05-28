import {Type} from "./console.types";
import {ClearScreenCommand, DisableCommand, EvaluateCommand, HelpCommand, LogsCommand} from "./processors";
import {ConsoleCommand} from "./processors/base/console.command";

export const COMMANDS: {DEFAULT: Type<ConsoleCommand>[], ALL: Type<ConsoleCommand>[]} = {
    DEFAULT: [
        HelpCommand,
        ClearScreenCommand,
        DisableCommand,
        LogsCommand,
        EvaluateCommand
    ],
    ALL: []
};
