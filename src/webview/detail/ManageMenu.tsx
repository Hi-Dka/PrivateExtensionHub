import { useEffect, useState } from 'preact/hooks';
import { ActionButton } from '../shared/ActionButton';

export interface ManageMenuProps {
    identifier: string;
    onAction: (action: string, version?: string) => void;
    onCopyId: () => void;
}

/**
 * Reference DOM: `li.action-item.action-dropdown-item` with the gear
 * `ActionButton` and the `.manage-menu` dropdown.
 */
export function ManageMenu({ identifier, onAction, onCopyId }: ManageMenuProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onDocumentClick = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (!target || !target.closest('.action-dropdown-item')) {
                setOpen(false);
            }
        };
        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    }, [open]);

    return (
        <li class="action-item action-dropdown-item">
            <ActionButton
                action="__manage"
                variant="icon"
                iconName="gear"
                classes="manage"
                title="Manage Extension"
                onActivate={() => setOpen((current) => !current)}
            />
            <div class={`manage-menu${open ? ' show' : ''}`} id="manageDropdown">
                <div
                    class="manage-menu-item"
                    data-action="installAnotherVersion"
                    onClick={() => {
                        setOpen(false);
                        onAction('installAnotherVersion');
                    }}
                >
                    <span class="codicon codicon-history" /> Install Specific Version...
                </div>
                <div
                    class="manage-menu-item"
                    data-copy={identifier}
                    onClick={() => {
                        setOpen(false);
                        onCopyId();
                    }}
                >
                    <span class="codicon codicon-copy" /> Copy Extension ID
                </div>
            </div>
        </li>
    );
}
