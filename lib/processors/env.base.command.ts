import AsyncStorage from "@react-native-async-storage/async-storage";
import {CommandProcessParameters} from "../console.service";
import {ReadLineOptions, Type} from "../console.types";
import {ConsoleCommand} from "./base/console.command";

export function createEnvCommand(args: {
    command: string,
    description: string,
    defaultValue?: string,
    onPrepare?: (value: string) => any,
    opts?: ReadLineOptions,
    onChange?: (value: string) => any,
    currentValueText?: string
    newValueText?: string
}): Type<ConsoleCommand> {
    const {command, description, onPrepare, opts, defaultValue, onChange, currentValueText, newValueText} = args;
    const storageKey = '__console_' + command;

    class EnvCommand extends ConsoleCommand {
        constructor() {
            super();
            this.command = command;
            this.description = description
        }

        async prepare() {
            if (onPrepare)
                onPrepare((await AsyncStorage.getItem(storageKey)) || defaultValue)
        }

        async process({session, readArgs, log, parseArgs}: CommandProcessParameters) {
            const currentValue = (await AsyncStorage.getItem(storageKey)) || defaultValue;
            log(`${currentValueText || 'Current value'}: ${currentValue}`);
            const [newValue] = await readArgs([
                {
                    title: newValueText || 'New value',
                    opts,
                },
            ]);
            if (newValue !== currentValue) {
                await AsyncStorage.setItem(storageKey, newValue);
                if (onChange)
                    onChange(newValue);
            }
        }
    }

    return EnvCommand;

}

export async function getEnvValue(command: string, defaultValue?: string){
    const storageKey = '__console_' + command;
    return (await AsyncStorage.getItem(storageKey)) || defaultValue
}
