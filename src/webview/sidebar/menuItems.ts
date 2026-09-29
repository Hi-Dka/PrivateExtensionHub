import type { SidebarItem, SidebarWebviewMessage } from '../types';
import type { ContextMenuItem } from '../shared/ContextMenu';

/** Right-click menu entries matching the previous behavior and wording. */
export function buildContextMenuItems(item: SidebarItem): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

    if (!item.isInstalled) {
        items.push({ action: 'install', label: 'Install', icon: 'cloud-download' });
        items.push({
            action: 'installAnotherVersion',
            label: 'Install Specific Version...',
            icon: 'history',
        });
    } else {
        if (item.hasUpdate) {
            items.push({ action: 'update', label: 'Update', icon: 'arrow-up' });
        }
        items.push({
            action: 'installAnotherVersion',
            label: 'Install Specific Version...',
            icon: 'history',
        });
        items.push({ action: 'uninstall', label: 'Uninstall', icon: 'trash' });
    }

    items.push({ action: 'copyId', label: 'Copy Extension ID', icon: 'copy', separatorBefore: true });
    items.push({ action: 'downloadVsix', label: 'Download VSIX', icon: 'link-external' });
    items.push({
        action: 'openDetail',
        label: 'Show Extension Details',
        icon: 'info',
        separatorBefore: true,
    });

    return items;
}

/** Translate a context-menu action into the host command message. */
export function buildMenuCommand(
    action: string,
    item: SidebarItem,
): SidebarWebviewMessage | null {
    switch (action) {
        case 'copyId':
            return { command: 'copy', text: item.info.id };
        case 'installAnotherVersion':
            return { command: 'installAnotherVersion', id: item.info.id };
        case 'downloadVsix':
            return {
                command: 'downloadVsix',
                id: item.info.id,
                version: item.latestVersion || item.info.version,
            };
        case 'openDetail':
            return { command: 'openDetail', id: item.info.id };
        case 'install':
        case 'uninstall':
            return { command: action, id: item.info.id };
        case 'update':
            return { command: 'update', id: item.info.id, version: item.latestVersion };
        default:
            return null;
    }
}
