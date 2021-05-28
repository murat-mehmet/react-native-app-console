import {CommandProcessParameters} from "../console.service";
import {ConsoleCommand} from "./base/console.command";

export class EvaluateCommand extends ConsoleCommand {
    thenFunc;

    constructor(readonly injected) {
        super();
        this.command = 'eval';
        this.description = 'Evaluates a function.'
    }

    async process({session, log, readArgs, readLine}: CommandProcessParameters) {
        const {stores} = this.injected;

        const [js] = await readArgs([{
            title: 'Js expression'
        }])
        if (js == '{') {
            let line = '', funcStr = '';
            while (true) {
                line = await readLine();
                if (line == '}')
                    break;
                funcStr += line += '\n';
            }
            const services = Object.entries(this.injected);
            const func = new Function(...services.map(x => x[0]), funcStr);
            log(await func(...services.map(x => x[1])))
        } else {
            const services = Object.entries(this.injected);
            const func = new Function(...services.map(x => x[0]), 'return ' + js);
            log(await func(...services.map(x => x[1])))
        }
    }

}
