import type { SidebarItem } from '../types';
import { ExtensionIcon } from '../shared/ExtensionIcon';
import { InstallCount } from '../shared/InstallCount';
import { RatingWidget } from '../shared/RatingWidget';
import { ActionButton } from '../shared/ActionButton';
import { shouldShowInstallCount, shouldShowRating } from '../shared/format';

export const EXTENSION_ROW_HEIGHT = 72;

export interface ExtensionCardProps {
    item: SidebarItem;
    top: number;
    onOpenDetail: (id: string) => void;
    onAction: (action: string, id?: string, version?: string) => void;
    onContextMenu: (event: MouseEvent, item: SidebarItem) => void;
}

/**
 * Reference DOM: `.monaco-list-row` > two `.extension-bookmark-container` +
 * `.extension-list-item` with the native header/footer structure.
 */
export function ExtensionCard({ item, top, onOpenDetail, onAction, onContextMenu }: ExtensionCardProps) {
    const { info } = item;
    const displayName = info.displayName || info.name;
    const publisher = info.namespace;
    const description = info.description || 'No description provided.';
    const id = info.id;

    return (
        <div
            class="monaco-list-row"
            data-extension-id={id}
            data-installed={String(item.isInstalled)}
            data-has-update={String(item.hasUpdate)}
            data-version={item.latestVersion || info.version}
            style={`top: ${top}px; height: ${EXTENSION_ROW_HEIGHT}px;`}
        >
            <div class="extension-bookmark-container" />
            <div class="extension-bookmark-container" />
            <div
                class="extension-list-item"
                data-action="detail"
                data-id={id}
                onClick={() => onOpenDetail(id)}
                onContextMenu={(event: MouseEvent) => onContextMenu(event, item)}
            >
                <div class="icon-container">
                    <ExtensionIcon iconUrl={info.iconUrl} />
                </div>
                <div class="details">
                    <div class="header-container">
                        <div class="header">
                            <span class="name" title={displayName}>
                                {displayName}
                            </span>
                            <span class="restart-required" />
                            <InstallCount count={info.downloadCount} visible={shouldShowInstallCount(item)} />
                            <RatingWidget
                                rating={info.rating}
                                ratingCount={info.ratingCount}
                                small
                                visible={shouldShowRating(item)}
                            />
                            <span class="sync-ignored" />
                            <span class="extension-kind-indicator" />
                            <span class="activation-status" />
                        </div>
                    </div>
                    <div class="description ellipsis" title={description}>
                        {description}
                    </div>
                    <div class="footer">
                        <div class="publisher-container">
                            <span class="publisher" title={publisher}>
                                <span class="publisher-name ellipsis">{publisher}</span>
                            </span>
                        </div>
                        <div class="monaco-action-bar">
                            <ul class="actions-container">
                                {!item.isInstalled ? (
                                    <li class="action-item">
                                        <ActionButton
                                            action="install"
                                            id={id}
                                            version={info.version}
                                            classes="install prominent"
                                            label="Install"
                                            title="Install"
                                            onActivate={onAction}
                                        />
                                    </li>
                                ) : null}
                                {item.isInstalled && item.hasUpdate && item.latestVersion ? (
                                    <li class="action-item">
                                        <ActionButton
                                            action="update"
                                            id={id}
                                            version={item.latestVersion}
                                            classes="update"
                                            label="Update"
                                            title={`Update to v${item.latestVersion}`}
                                            onActivate={onAction}
                                        />
                                    </li>
                                ) : null}
                                {item.isInstalled ? (
                                    <li class="action-item">
                                        <ActionButton
                                            action="manage"
                                            id={id}
                                            variant="icon"
                                            iconName="gear"
                                            classes="manage"
                                            title="Manage Extension"
                                            onActivate={onAction}
                                        />
                                    </li>
                                ) : null}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
