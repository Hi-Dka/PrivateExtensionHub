import type { ComponentChildren } from 'preact';
import type { DetailState } from '../types';
import { ExtensionIcon } from '../shared/ExtensionIcon';
import { RatingWidget } from '../shared/RatingWidget';
import { ActionButton } from '../shared/ActionButton';
import { ManageMenu } from './ManageMenu';

export interface EditorHeaderProps {
    state: DetailState;
    onAction: (action: string, version?: string) => void;
    onCopyId: () => void;
}

/** Reference DOM: `.header > .icon-container + .details(.title/.subtitle/.description/.actions-status-container)`. */
export function EditorHeader({ state, onAction, onCopyId }: EditorHeaderProps) {
    const extension = state.extension;
    const displayName = extension.displayName || extension.name;
    const publisher = extension.namespace || '';
    const description = extension.description || '';

    const subtitleEntries: ComponentChildren[] = [];
    subtitleEntries.push(
        <span class="publisher">
            <span class="publisher-name ellipsis">{publisher}</span>
        </span>,
    );
    if (extension.downloadCount) {
        subtitleEntries.push(
            <span class="install">
                <span class="codicon codicon-cloud-download" />
                <span class="count">{extension.downloadCount.toLocaleString()}</span>
            </span>,
        );
    }
    if (extension.rating && extension.ratingCount) {
        subtitleEntries.push(
            <RatingWidget rating={extension.rating} ratingCount={extension.ratingCount} small={false} />,
        );
    }

    return (
        <>
            <div class="icon-container">
                <ExtensionIcon iconUrl={extension.iconUrl} />
            </div>
            <div class="details">
                <div class="title">
                    <span class="name">{displayName}</span>
                </div>
                <div class="subtitle">
                    {subtitleEntries.map((entry, index) => (
                        <div
                            class={`subtitle-entry${
                                index === subtitleEntries.length - 1 ? ' last-non-empty' : ''
                            }`}
                        >
                            {entry}
                        </div>
                    ))}
                </div>
                <div class="description">{description}</div>
                <div class="actions-status-container">
                    <div class="monaco-action-bar">
                        <ul class="actions-container">
                            {!state.isInstalled ? (
                                <li class="action-item">
                                    <ActionButton
                                        action="install"
                                        version={extension.version}
                                        classes="install prominent"
                                        label="Install"
                                        title="Install"
                                        onActivate={onAction}
                                    />
                                </li>
                            ) : null}
                            {state.isInstalled && state.hasUpdate && state.latestVersion ? (
                                <li class="action-item">
                                    <ActionButton
                                        action="update"
                                        version={state.latestVersion}
                                        classes="update"
                                        label={`Update to v${state.latestVersion}`}
                                        title={`Update to v${state.latestVersion}`}
                                        onActivate={onAction}
                                    />
                                </li>
                            ) : null}
                            {state.isInstalled ? (
                                <li class="action-item">
                                    <ActionButton
                                        action="uninstall"
                                        classes="uninstall"
                                        label="Uninstall"
                                        title="Uninstall"
                                        onActivate={onAction}
                                    />
                                </li>
                            ) : null}
                            <ManageMenu
                                identifier={extension.id}
                                onAction={(action) => onAction(action)}
                                onCopyId={onCopyId}
                            />
                        </ul>
                    </div>
                    <div class="status" />
                </div>
            </div>
        </>
    );
}
