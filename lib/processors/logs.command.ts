import AsyncStorage from "@react-native-async-storage/async-storage";
import {CommandProcessParameters, ConsoleService} from "../console.service";
import {ConsoleCommand} from "./base/console.command";

export class LogsCommand extends ConsoleCommand {
    constructor(readonly injected: {consoleService: ConsoleService}) {
        super();
        this.command = 'logs';
        this.description = 'Displays console logs'
    }

    async prepare(): Promise<any> {
        const {injected} = this;
        await AsyncStorage.getItem('console-logs-startup')
            .then(v => {
                if (v == '1') {
                    const session = injected.consoleService.getSession();
                    session.cancel = false;
                    session.onCancel = null;
                    session.running = true;
                    this.listenConsole(
                        (...text) => injected.consoleService.log(session, text.map(x => typeof x == "object" ? JSON.stringify(x, null, 2) : x).join(' ')),
                        session
                    ).catch(e => {
                        if (session.cancel) return;
                        session.logs += e + '\n';
                    }).finally(() => {
                        if (session.cancel) return;
                        session.running = false;
                    });
                }
            })
    }

    async process({session, log, parseArgs}: CommandProcessParameters) {
        const [key, value] = parseArgs();
        switch (key) {
            case 'startup':
                AsyncStorage.setItem('console-logs-startup', value);
                log('Saved startup logging')
                break;
            default:
                this.listenConsole(log, session)
                break;
        }
    }

    async listenConsole(log, session) {
        const originalLog = console.log;
        log('Listening logs')

        this.injected.consoleService.consoleOptions.logs?.onListen?.call(this);

        console.log = function() {
            log(...arguments);
            originalLog.apply(console, arguments);
        };
        await new Promise(r => {
            session.onCancel = r;
        })
        console.log = originalLog;
    }

}
