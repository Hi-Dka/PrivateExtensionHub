export interface ContextMenuItem {
    action: string;
    label: string;
    icon?: string;
    separatorBefore?: boolean;
}

export interface ContextMenuProps {
    open: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
    onSelect: (action: string) => void;
}

const MENU_MIN_WIDTH = 170;
const MENU_ESTIMATED_ITEM_HEIGHT = 26;

/**
 * Reference DOM: `.monaco-menu-container` > `.monaco-menu` > `.action-menu-item[data-menu-action]`.
 * Positioned at the cursor with viewport-edge clamping; hidden when closed.
 */
export function ContextMenu({ open, x, y, items, onSelect }: ContextMenuProps) {
    if (!open) {
        return null;
    }

    let left = x;
    let top = y;
    if (typeof window !== 'undefined') {
        const estimatedWidth = Math.max(MENU_MIN_WIDTH, 190);
        const estimatedHeight = items.length * MENU_ESTIMATED_ITEM_HEIGHT + 8;
        left = Math.max(4, Math.min(x, window.innerWidth - estimatedWidth - 6));
        top = Math.max(4, Math.min(y, window.innerHeight - estimatedHeight - 6));
    }

    return (
        <div class="monaco-menu-container" style={`display: block; left: ${left}px; top: ${top}px;`}>
            <div class="monaco-menu">
                <ul class="actions-container" role="menu">
                    {items.map((item) => (
                        <>
                            {item.separatorBefore ? (
                                <li class="action-item action-item-separator" role="presentation" />
                            ) : null}
                            <li class="action-item" role="presentation">
                                <a
                                    class="action-menu-item"
                                    role="menuitem"
                                    data-menu-action={item.action}
                                    onClick={(event: Event) => {
                                        event.stopPropagation();
                                        onSelect(item.action);
                                    }}
                                >
                                    {item.icon ? (
                                        <span class={`menu-item-icon codicon codicon-${item.icon}`} />
                                    ) : null}
                                    <span class="action-label">{item.label}</span>
                                </a>
                            </li>
                        </>
                    ))}
                </ul>
            </div>
        </div>
    );
}
