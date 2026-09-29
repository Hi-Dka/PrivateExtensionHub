import { useState } from 'preact/hooks';

export interface ExtensionIconProps {
    iconUrl?: string;
}

/**
 * Reference DOM: `.extension-icon > img.icon + span.codicon.codicon-extensions`.
 * The image is hidden until it loads; on error (or when no URL exists) the
 * codicon fallback is shown instead.
 */
export function ExtensionIcon({ iconUrl }: ExtensionIconProps) {
    const [failed, setFailed] = useState(false);
    const showFallback = !iconUrl || failed;

    return (
        <div class="extension-icon">
            <img
                class="icon"
                alt=""
                src={iconUrl}
                style={showFallback ? 'display: none;' : undefined}
                onError={() => setFailed(true)}
            />
            <span
                class="codicon codicon-extensions"
                style={showFallback ? undefined : 'display: none;'}
            />
        </div>
    );
}
