import {Type} from "./console.types";
import {ClearScreenCommand, DisableCommand, EvaluateCommand, HelpCommand, InviteCommand, LogsCommand} from "./processors";
import {AlertCommand} from "./processors/alert.command";
import {ConsoleCommand} from "./processors/base/console.command";
import {EchoCommand} from "./processors/echo.command";

export const COMMANDS: {DEFAULT: Type<ConsoleCommand>[], ALL: Type<ConsoleCommand>[]} = {
    DEFAULT: [
        HelpCommand,
        ClearScreenCommand,
        DisableCommand,
        LogsCommand,
        EvaluateCommand,
        InviteCommand,
        AlertCommand,
        EchoCommand,
    ],
    ALL: []
};
