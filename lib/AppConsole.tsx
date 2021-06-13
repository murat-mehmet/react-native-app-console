import AsyncStorage from "@react-native-async-storage/async-storage";
import _ from 'lodash';
import React, {Component} from 'react';
import {SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View} from "react-native";
import {COMMANDS} from "./all.commands";
import {ConsoleService} from "./console.service";
import {ConsoleOptions, DEFAULT_OPTIONS, ReadArgMap, ReadArgOptions, ReadLineOptions, SessionObject} from "./console.types";
import {instanceWrapper} from "./instance.wrapper";

export class AppConsole extends Component<Props> {
    state = {
        enabled: false,
        shown: true,
        logs: '',
        command: '',
        running: false,
        readLine: false,
        readLineOpts: {} as ReadLineOptions,
        remoteConnected: false
    }
    timer;
    service: ConsoleService;
    scrollView: ScrollView;
    activationPhrase = '';

    constructor(props) {
        super(props);
        if (instanceWrapper.preparedService) {
            this.service = instanceWrapper.preparedService;
            const session = this.service.getSession();
            if (session.running && !session.readLineCallback) {
                Object.assign(this.state, {
                    command: '',
                    logs: session.logs,
                    running: session.running,
                    readLine: !!session.readLineCallback,
                    readLineOpts: session.readLineOpts
                })
                this.timer = setInterval(() => {
                    Object.assign(this.state, {
                        command: '',
                        logs: session.logs,
                        running: session.running,
                        readLine: !!session.readLineCallback,
                        readLineOpts: session.readLineOpts
                    })
                    if (!session.running || session.readLineCallback)
                        clearInterval(this.timer);
                }, 300)
            } else {
                Object.assign(this.state, {
                    command: '',
                    logs: session.logs,
                    running: session.running,
                    readLine: !!session.readLineCallback,
                    readLineOpts: session.readLineOpts
                })
            }
        } else {
            const consoleOptions = _.merge(DEFAULT_OPTIONS, this.props.options);
            if (consoleOptions.commands)
                COMMANDS.ALL = [
                    ...COMMANDS.DEFAULT,
                    ...consoleOptions.commands
                ]
            this.service = new ConsoleService(consoleOptions);
            this.service.onPrepare = () => {
                const session = this.service.getSession();
                this.updateState(session)
            };
        }
    }


    componentDidMount() {
        instanceWrapper.instance = this;
        (async () => {
            const commands = JSON.parse(await AsyncStorage.getItem('command-history') || '[]');
            this.commandStore = {
                index: commands.length,
                commandCount: commands.length,
                prevCommand: commands,
                put: function(val) {
                    if (!val)
                        return;
                    if (this.prevCommand.indexOf(val) > -1) {
                        this.prevCommand = this.prevCommand.filter(x => x != val);
                        this.commandCount = this.prevCommand.length;
                    }
                    this.commandCount++;
                    this.index = this.commandCount;
                    this.prevCommand.push(val);
                    if (this.commandCount > 30) {
                        this.prevCommand.shift();
                        this.commandCount = this.prevCommand.length;
                        this.index = this.commandCount;
                    }
                    AsyncStorage.setItem('command-history', JSON.stringify(this.prevCommand));
                },
                get: function(isUp) {
                    if (isUp && this.index > 0)
                        this.index--;
                    else if (!isUp && this.index < this.commandCount)
                        this.index++;
                    if (typeof this.prevCommand[this.index] !== "undefined") {
                        return this.prevCommand[this.index];
                    }
                    return '';
                }

            }
            if (await AsyncStorage.getItem('console-enabled') == '1')
                this.setState({
                    enabled: true,
                    shown: false
                })
        })().catch(console.warn)
    }

    submit = () => {
        let command = this.state.command;

        if (command == null)
            command = '';


        const escaped = command.replace(/\\\|/g, '\r\n');
        const cmds = escaped.split("|").filter(x => x)
            .map(x => x.replace(/\r\n/g, '|'));
        const session = this.service.getSession();

        if (command == 'ctrl+c') {
            session.cancel = true;
            session.onCancel?.call(this);
            if (session.readLineCallback) {
                session.readLineCallback(null);
                session.logs += '\n';
                session.readLineCallback = null;
            }
            session.logs += 'Operation canceled\n';
            session.running = false;
        } else {
            if (session.readLineCallback) {
                (async () => {
                    session.readLineCallback(command);
                })().catch(e => {
                    if (session.cancel) return;
                    session.logs += e + '\n'
                    session.running = false;
                })
                session.readLineCallback = null;
            } else {
                this.commandStore.put(command);

                session.cancel = false;
                session.onCancel = null;
                session.running = true;
                (async () => {
                    if (!cmds.length) {
                        session.logs += `\napp:/> `
                    }
                    for (let i = 0; i < cmds.length; i++) {
                        let cmd = cmds[i];
                        const {cmd: parsed, arg} = this.service.parse(cmd, session);
                        await parsed.process({
                            session,
                            arg,
                            rawCommand: cmd,
                            log: (...text) => this.service.log(session, text.map(x => typeof x == "object" ? JSON.stringify(x, null, 2) : x).join(' ')),
                            logTable: (entities, noColumns?) => this.service.log(session, this.service.toTable(entities, noColumns)),
                            readArgs: (mapList: ReadArgMap[], parameters?: ReadArgOptions): Promise<string[]> => this.service.readArgs(session, arg, mapList, parameters),
                            readLine: (title?: string, opts?: ReadLineOptions): Promise<string> => this.service.readLine(session, title || '', opts),
                            parseArgs: (funcArg?: string) => this.service.parseArgs(funcArg || arg),
                            toTable: this.service.toTable
                        });
                    }
                })().catch(e => {
                    if (session.cancel) return;
                    session.logs += e + '\n';
                }).finally(() => {
                    if (session.cancel) return;
                    session.running = false;
                });
            }
        }
        setTimeout(() => {
            this.updateState(session);
        })
    }

    updateState = (session: SessionObject) => {
        if (session.running && !session.readLineCallback) {
            this.setState({
                command: '',
                logs: session.logs,
                running: session.running,
                readLine: !!session.readLineCallback,
                readLineOpts: session.readLineOpts
            })
            this.checkRemoteConnection(session);
            this.timer = setInterval(() => {
                this.setState({
                    command: '',
                    logs: session.logs,
                    running: session.running,
                    readLine: !!session.readLineCallback,
                    readLineOpts: session.readLineOpts
                })
                this.checkRemoteConnection(session);
                if (!session.running || session.readLineCallback)
                    clearInterval(this.timer);
            }, 300)
        } else {
            this.setState({
                command: '',
                logs: session.logs,
                running: session.running,
                readLine: !!session.readLineCallback,
                readLineOpts: session.readLineOpts
            })
        }
        this.checkRemoteConnection(session);
    }
    remoteStreamAction = async (session: SessionObject) => {
        try {
            const result = await fetch(session.invitedConnection.url + 'remote/stream', {
                headers: {
                    'content-type': 'application/json'
                },
                method: 'post',
                body: JSON.stringify({
                    name: session.invitedConnection.name,
                    result: session.logs,
                    running: session.running,
                    readLine: !!session.readLineCallback,
                    readLineOpts: session.readLineOpts
                })
            }).then(x => {
                if (!x.ok)
                    return x.json().then(y => {throw new Error(y.message)})
                return x.json()
            });
            if (result.command)
                this.setState({command: result.command}, this.submit);

        } catch (e) {
            session.logs += e + '\n';
            this.setState({remoteConnected: false, logs: session.logs});
            session.invitedConnection = null
            this.remoteTimer = null;
            return;
        }
        if (!session.running || !!session.readLineCallback)
            this.remoteTimer = setTimeout(() => this.remoteStreamAction(session), 1000);
        else
            this.remoteTimer = null;
    }

    remoteTimer
    checkRemoteConnection = (session: SessionObject) => {
        if (session.invitedConnection) {
            this.setState({remoteConnected: true});

            if (!this.remoteTimer && (!session.running || !!session.readLineCallback))
                this.remoteTimer = setTimeout(() => this.remoteStreamAction(session), 1000);
            else {
                this.remoteStreamAction(session);
                this.remoteTimer = null;
            }
        }
        else
            this.setState({remoteConnected: false});
    }
    closeRemoteConnection = async () => {
        const session = this.service.getSession();
        if (session.invitedConnection) {
            const result = await fetch(session.invitedConnection.url + 'remote/close', {
                headers: {
                    'content-type': 'application/json'
                },
                method: 'post',
                body: JSON.stringify({
                    name: session.invitedConnection.name,
                })
            });
            this.setState({remoteConnected: false});
            if (this.remoteTimer)
                clearTimeout(this.remoteTimer);
            session.invitedConnection = null
            this.remoteTimer = null;

        }
    }

    commandStore;

    render() {
        if (!this.state.enabled) return null;
        return (
            <>
                {this.state.shown &&
                <View style={styles.container}>
                    <SafeAreaView style={{flex: 1}}>
                        {this.state.remoteConnected &&
                        <View style={{backgroundColor: 'white'}}>
                            <Text style={[styles.text, {color: 'black'}]}>This console is controlled by remote end</Text>
                            <Text style={[styles.text, {color: 'black', paddingHorizontal: 10}]} onPress={this.closeRemoteConnection}>[ Close
                                Connection ]</Text>
                        </View>
                        }
                        <ScrollView style={{flex: 1}} keyboardShouldPersistTaps={'always'}

                                    ref={ref => {this.scrollView = ref}}
                                    onContentSizeChange={() => this.scrollView?.scrollToEnd({animated: true})}>
                            <Text style={styles.text}>{`App Console | ${this.service.consoleOptions.name} \n` + 'All rights reserved.\n'}</Text>
                            <Text selectable style={styles.text}>{this.state.logs}</Text>
                            {!this.state.running &&
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Text style={styles.text}>{'app:/> '}</Text>
                                <TextInput numberOfLines={1} style={[styles.text, styles.textInput]} autoFocus
                                           autoCorrect={false}
                                           autoCapitalize={'none'}
                                           value={this.state.command}
                                           blurOnSubmit={false}
                                           onSubmitEditing={this.submit}
                                           onChangeText={command => this.setState({command})} />
                            </View>
                            }
                            {this.state.running && this.state.readLine && !this.state.readLineOpts.select &&
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Text style={styles.text}>{this.state.readLineOpts['title']}</Text>
                                <TextInput numberOfLines={1} style={[styles.text, styles.textInput]} autoFocus
                                           autoCorrect={false}
                                           autoCapitalize={'none'}
                                           value={this.state.command}
                                           blurOnSubmit={false}
                                           secureTextEntry={this.state.readLineOpts.secure}
                                           onSubmitEditing={this.submit}
                                           onChangeText={command => this.setState({command})} />
                            </View>
                            }
                            {this.state.running && this.state.readLine && !!this.state.readLineOpts.select &&
                            <View>
                                <Text style={styles.text}>{this.state.readLineOpts['title']}</Text>
                                {(this.state.readLineOpts.select as any[]).map((x, i) => (
                                    <TouchableOpacity key={i} style={[styles.selectButton, i > 0 && {borderTopWidth: 0}]} onPress={() => {
                                        let command = Array.isArray(x) ? x[0] : x;
                                        this.setState({command}, this.submit);
                                    }}>
                                        <Text style={styles.text}>{Array.isArray(x) ? x[1] : x}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            }
                        </ScrollView>
                        <View style={{flexDirection: 'row'}}>
                            {this.state.running ?
                                <Text style={[styles.text, {paddingHorizontal: 10}]} onPress={() => {
                                    this.setState({command: 'ctrl+c'}, this.submit)
                                }}>[ Cancel ]</Text>
                                :
                                <>
                                    <Text style={[styles.text, {paddingHorizontal: 10}]} onPress={() => {
                                        const val = this.commandStore.get(true);
                                        this.setState({command: val})
                                    }}>[ Previous ]</Text>
                                    <Text style={[styles.text, {paddingHorizontal: 10}]} onPress={() => {
                                        const val = this.commandStore.get(false);
                                        this.setState({command: val})
                                    }}>[ Next ]</Text>
                                </>
                            }
                        </View>
                    </SafeAreaView>
                    <StatusBar backgroundColor={'black'} barStyle='light-content' translucent={false} />
                </View>
                }
                <TouchableOpacity style={styles.showButton} onPress={() => this.setState({shown: !this.state.shown})}>
                    <Text style={[styles.text]}>{':/>'}</Text>
                </TouchableOpacity>
            </>
        );
    }

    static handleTap = (char?) => {
        char = typeof char != 'string' ? '0' : char;
        const fullPhrase = instanceWrapper.instance.service.consoleOptions.activation.phrase;
        let nextValidChar = fullPhrase[instanceWrapper.instance.activationPhrase.length];
        if (char != nextValidChar) {
            instanceWrapper.instance.activationPhrase = '';
            nextValidChar = fullPhrase[0];
        }
        if (char == nextValidChar)
            instanceWrapper.instance.activationPhrase += char;

        if (instanceWrapper.instance.activationPhrase == fullPhrase) {
            instanceWrapper.instance.activationPhrase = '';
            instanceWrapper.instance.setState({enabled: true});
            AsyncStorage.setItem('console-enabled', '1')
        }
    }

    static prepare = async (options: ConsoleOptions) => {
        return new Promise<void>(r => {
            const consoleOptions = _.merge(DEFAULT_OPTIONS, options);
            if (consoleOptions.commands)
                COMMANDS.ALL = [
                    ...COMMANDS.DEFAULT,
                    ...consoleOptions.commands
                ]
            const service = new ConsoleService(consoleOptions);
            service.onPrepare = () => {
                instanceWrapper.preparedService = service;
                instanceWrapper.isPrepared = true;
                r();
            };
        })
    }
}


const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        padding: 10
    },
    text: {
        fontFamily: 'monospace',
        color: 'white'
    },
    textInput: {
        flex: 1,
        padding: 0,
        margin: 0
    },
    showButton: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        height: 60,
        width: 60,
        borderRadius: 30,
        backgroundColor: 'black',
        borderWidth: 1,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center'
    },
    selectButton: {
        padding: 5,
        borderColor: '#444444',
        borderWidth: 1
    }
});

interface Props {
    options?: ConsoleOptions
}
