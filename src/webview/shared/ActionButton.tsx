export interface ActionButtonProps {
    action: string;
    id?: string;
    version?: string;
    variant?: 'label' | 'icon';
    label?: string;
    /** Codicon name for the icon variant (e.g. `gear`). */
    iconName?: string;
    /** Extra reference classes, e.g. `install prominent` or `manage`. */
    classes?: string;
    title?: string;
    onActivate?: (action: string, id?: string, version?: string) => void;
}

/**
 * Reference DOM: `a.action-label.extension-action` with the native action
 * classes (`label`/`icon`, `install prominent`, `update`, `uninstall`,
 * `manage codicon codicon-gear`).
 */
export function ActionButton({
    action,
    id,
    version,
    variant = 'label',
    label,
    iconName,
    classes,
    title,
    onActivate,
}: ActionButtonProps) {
    const classNames = ['action-label', 'extension-action', variant, classes];
    if (variant === 'icon' && iconName) {
        classNames.push('codicon', `codicon-${iconName}`);
    }

    return (
        <a
            class={classNames.filter(Boolean).join(' ')}
            role="button"
            tabindex={0}
            data-action={action}
            data-id={id}
            data-version={version}
            title={title}
            onClick={(event: Event) => {
                event.stopPropagation();
                onActivate?.(action, id, version);
            }}
        >
            {variant === 'label' ? label : null}
        </a>
    );
}
