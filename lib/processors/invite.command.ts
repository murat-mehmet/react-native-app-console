import AsyncStorage from "@react-native-async-storage/async-storage";
import {CommandProcessParameters, ConsoleService} from "../console.service";
import {instanceWrapper} from "../instance.wrapper";
import {ConsoleCommand} from "./base/console.command";

export class InviteCommand extends ConsoleCommand {
    constructor(readonly injected: {consoleService: ConsoleService}) {
        super();
        this.command = 'invite';
        this.description = 'Invite a remote console.'
    }

    async prepare(): Promise<any> {
        const {injected} = this;
        await AsyncStorage.getItem('console-invite-startup')
            .then(async v => {
                if (v == '1') {
                    const url = await AsyncStorage.getItem('console-invite-url')
                    const name = await AsyncStorage.getItem('console-invite-name')
                    const session = injected.consoleService.getSession();
                    setTimeout(async () => {
                        await this.inviteThirtySeconds(
                            (...text) => injected.consoleService.log(session, text.map(x => typeof x == "object" ? JSON.stringify(x, null, 2) : x).join(' ')),
                            session, url, name)
                            .catch(e => {
                                session.logs += e + '\n';
                            });
                    }, 1000)
                }
            })
    }

    async process({log, session, readLine, readArgs, parseArgs}: CommandProcessParameters) {
        const {consoleService} = this.injected;

        const [key, value] = parseArgs();
        switch (key) {
            case 'startup':
                if (value == '1') {
                    const defaultId = consoleService.makeId(8);
                    const defaultUrl = await AsyncStorage.getItem('console-invite-url');
                    const defaultName = await AsyncStorage.getItem('console-invite-name') || defaultId;
                    const url = await readLine(`Url${defaultUrl ? ' [' + defaultUrl + ']' : ''}:`) || defaultUrl;
                    const name = await readLine(`Your connection name [${defaultName}]:`) || defaultName;
                    AsyncStorage.setItem('console-invite-url', url);
                    AsyncStorage.setItem('console-invite-name', name);
                }
                AsyncStorage.setItem('console-invite-startup', value);
                log('Saved startup invitation')
                break;
            default:
                const defaultId = consoleService.makeId(8);
                let [url, name] = await readArgs([{
                    title: 'Url',
                }, {
                    title: 'Your connection name',
                    default: defaultId
                }]);
                await this.invite(log, session, url, name)
                break;
        }

    }

    invite = async (log, session, url, name) => {
        log('Waiting for remote end to join');
        if (!url.endsWith('/'))
            url += '/';
        while (!session.cancel) {
            const result = await fetch(url + 'remote/invite?v=1&p=app&name=' + encodeURIComponent(name)).then(x => x.json());
            if (result.joined) break;
            await new Promise(r => setTimeout(r, 2000));
        }
        if (session.cancel) return;
        log('Remote end is now connected to this console.')
        session.invitedConnection = {
            name,
            url
        };
    }

    inviteThirtySeconds = async (log, session, url, name) => {
        log('Waiting for remote end to join');
        const ends = Date.now() + 30000;
        if (!url.endsWith('/'))
            url += '/';
        let result: any;
        while (Date.now() < ends) {
            result = await fetch(url + 'remote/invite?v=1&p=app&name=' + encodeURIComponent(name)).then(x => x.json());
            if (result.joined) break;
            await new Promise(r => setTimeout(r, 2000));
        }
        if (!result.joined)
            return log('Invitation timeout')
        log('Remote end is now connected to this console.')
        session.invitedConnection = {
            name,
            url
        };
        instanceWrapper.instance?.updateState(session)
    }

}
