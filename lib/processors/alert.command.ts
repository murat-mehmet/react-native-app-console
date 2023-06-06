import {Alert} from "react-native";
import {CommandProcessParameters, ConsoleService} from "../console.service";
import {ConsoleCommand} from "./base/console.command";

export class AlertCommand extends ConsoleCommand {
    constructor(readonly injected: {consoleService: ConsoleService}) {
        super();
        this.command = 'alert';
        this.description = 'Displays an alert dialog'
    }

    async process({arg}: CommandProcessParameters) {
        const {consoleService} = this.injected;
        Alert.alert(`App Console | ${consoleService.consoleOptions.name}`, arg || '')
    }
}
