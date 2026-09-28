import * as vscode from 'vscode';

class Logger {
    private _channel: vscode.LogOutputChannel | undefined;

    public init(context: vscode.ExtensionContext) {
        this._channel = vscode.window.createOutputChannel('PrivateExtensionHub', {
            log: true,
        });
        context.subscriptions.push(this._channel);
    }

    public info(message: string, ...args: any[]) {
        this._channel?.info(message, ...args);
    }

    public warn(message: string, ...args: any[]) {
        this._channel?.warn(message, ...args);
    }

    public error(message: string | Error, ...args: any[]) {
        if (message instanceof Error) {
            this._channel?.error(message.message, ...args);
            if (message.stack) {
                this._channel?.error(message.stack);
            }
        } else {
            this._channel?.error(message, ...args);
        }
    }

    public debug(message: string, ...args: any[]) {
        this._channel?.debug(message, ...args);
    }

    public trace(message: string, ...args: any[]) {
        this._channel?.trace(message, ...args);
    }

    public show() {
        this._channel?.show();
    }
}

export const Log = new Logger();
