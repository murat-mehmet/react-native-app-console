import AsyncStorage from "@react-native-async-storage/async-storage";
import {CommandProcessParameters} from "../console.service";
import {instanceWrapper} from "../instance.wrapper";
import {ConsoleCommand} from "./base/console.command";

export class DisableCommand extends ConsoleCommand {
    constructor() {
        super();
        this.command = 'disable';
        this.description = 'Disabled developer mode'
    }

    async process({session}: CommandProcessParameters) {
        AsyncStorage.setItem('console-enabled', '0')
        instanceWrapper.instance.setState({enabled: false})
    }
}
