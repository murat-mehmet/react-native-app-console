import {CommandProcessParameters, ConsoleService} from "../console.service";
import {ConsoleCommand} from "./base/console.command";

export class InviteCommand extends ConsoleCommand {
    constructor(readonly injected: {consoleService: ConsoleService}) {
        super();
        this.command = 'invite';
        this.description = 'Invite a remote console.'
    }

    async process({log, session, readLine, readArgs, parseArgs}: CommandProcessParameters) {
        const { consoleService } = this.injected;
        let [url] = await readArgs([{
            title: 'Url',
        }]);

        //waiting connection
        if (!url) return log('Url is required');
        const defaultId = consoleService.makeId(8);
        const name = await readLine(`Your connection name [${defaultId}]:`) || defaultId;
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

}

const serviceName = process.env.SERVICE || 'home';
