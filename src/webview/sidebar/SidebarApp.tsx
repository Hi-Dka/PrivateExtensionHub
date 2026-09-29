import { useEffect, useState } from 'preact/hooks';
import type { SidebarItem, SidebarState, SidebarWebviewMessage } from '../types';
import { getWebviewApi } from '../api';
import { SearchBox } from './SearchBox';
import { ExtensionList } from './ExtensionList';
import { buildContextMenuItems, buildMenuCommand } from './menuItems';
import { ContextMenu } from '../shared/ContextMenu';

export const EMPTY_SIDEBAR_STATE: SidebarState = {
    isLoading: true,
    isSearching: false,
    query: '',
    items: [],
    emptyMessage: null,
};

interface MenuState {
    open: boolean;
    x: number;
    y: number;
    item: SidebarItem | null;
}

export function SidebarApp({ initialState }: { initialState: SidebarState }) {
    const [state, setState] = useState(initialState);
    const [menu, setMenu] = useState<MenuState>({ open: false, x: 0, y: 0, item: null });
    const api = getWebviewApi();
    const post = (message: SidebarWebviewMessage) => api?.postMessage(message);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const data = event.data as { type?: string; state?: SidebarState } | undefined;
            if (data && data.type === 'sidebar:state' && data.state) {
                setState(data.state);
            }
        };
        window.addEventListener('message', onMessage);
        post({ command: 'ready' });
        return () => window.removeEventListener('message', onMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closeMenu = () => setMenu((current) => (current.open ? { ...current, open: false } : current));

    return (
        <div
            class="extensions-viewlet"
            onClick={closeMenu}
            onContextMenu={(event: MouseEvent) => {
                const target = event.target as Element | null;
                if (!target || !target.closest('.monaco-list-row')) {
                    closeMenu();
                }
            }}
        >
            <div class="header">
                <div class="extensions-search-container">
                    <SearchBox
                        initialQuery={state.query}
                        onSearch={(query) => post({ command: 'search', query })}
                        onClear={() => post({ command: 'clearSearch' })}
                    />
                </div>
            </div>

            <ExtensionList
                items={state.items}
                isLoading={state.isLoading}
                emptyMessage={state.emptyMessage}
                onOpenDetail={(id) => post({ command: 'openDetail', id })}
                onAction={(action, id, version) =>
                    post({ command: action as SidebarWebviewMessage['command'], id, version })
                }
                onContextMenu={(event, item) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenu({ open: true, x: event.clientX, y: event.clientY, item });
                }}
            />

            <ContextMenu
                open={menu.open}
                x={menu.x}
                y={menu.y}
                items={menu.item ? buildContextMenuItems(menu.item) : []}
                onSelect={(action) => {
                    const item = menu.item;
                    setMenu((current) => ({ ...current, open: false }));
                    if (!item) {
                        return;
                    }
                    const message = buildMenuCommand(action, item);
                    if (message) {
                        post(message);
                    }
                }}
            />
        </div>
    );
}
