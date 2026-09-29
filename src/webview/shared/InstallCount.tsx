import { formatInstallCount } from './format';

export interface InstallCountProps {
    count?: number;
    /** Callers pass the reference visibility rule (`!isInstalled`). */
    visible: boolean;
}

/**
 * Reference DOM: `.install-count` > `span.codicon.codicon-cloud-download` + `span.count`.
 * The container is always rendered; the CSS `:not(:empty)` rule controls layout.
 */
export function InstallCount({ count, visible }: InstallCountProps) {
    const formatted = visible ? formatInstallCount(count) : '';

    return (
        <span class="install-count">
            {formatted ? (
                <>
                    <span class="codicon codicon-cloud-download" />
                    <span class="count">{formatted}</span>
                </>
            ) : null}
        </span>
    );
}
