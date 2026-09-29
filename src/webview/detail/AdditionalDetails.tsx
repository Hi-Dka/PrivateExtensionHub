import { useState } from 'preact/hooks';
import type { DetailState } from '../types';

export interface AdditionalDetailsProps {
    state: DetailState;
    onOpenExternal: (url: string) => void;
    onCopyId: () => void;
}

/**
 * Reference DOM: `.additional-details-content` with the Categories, Resources,
 * and Marketplace sections.
 */
export function AdditionalDetails({ state, onOpenExternal, onCopyId }: AdditionalDetailsProps) {
    const { extension, manifest } = state;
    const [copied, setCopied] = useState(false);

    const currentVersion = state.isInstalled
        ? state.installedVersion || extension.version
        : extension.version;
    const cleanRegistry = state.registryUrl.replace(/\/+$/, '');
    const vsixDownloadUrl = `${cleanRegistry}/api/${extension.namespace}/${extension.name}/${currentVersion}/file/${extension.namespace}.${extension.name}-${currentVersion}.vsix`;

    const categories = manifest?.categories ?? [];

    const resourceLink = (href: string, label: string, icon: string) => (
        <div class="resource">
            <span class={`codicon ${icon}`} />
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event: Event) => {
                    event.preventDefault();
                    onOpenExternal(href);
                }}
            >
                {label}
            </a>
        </div>
    );

    return (
        <div class="additional-details-content">
            {categories.length > 0 ? (
                <div class="categories-container additional-details-element">
                    <div class="additional-details-title">Categories</div>
                    <div class="categories">
                        {categories.map((category: string) => (
                            <span class="category">{category}</span>
                        ))}
                    </div>
                </div>
            ) : null}

            <div class="resources-container additional-details-element">
                <div class="additional-details-title">Resources</div>
                <div class="resources">
                    {extension.repositoryUrl
                        ? resourceLink(extension.repositoryUrl, 'Repository', 'codicon-repo')
                        : null}
                    {manifest?.bugs?.url
                        ? resourceLink(manifest.bugs.url, 'Issues', 'codicon-issues')
                        : null}
                    {resourceLink(vsixDownloadUrl, 'Download VSIX', 'codicon-link-external')}
                </div>
            </div>

            <div class="more-info-container additional-details-element">
                <div class="additional-details-title">Marketplace</div>
                <div class="more-info">
                    <div class="more-info-entry">
                        <div class="more-info-entry-name">Identifier</div>
                        <div>
                            <span>{extension.id}</span>
                            <button
                                class="copy-icon-btn"
                                title="Copy Extension ID"
                                data-copy={extension.id}
                                onClick={() => {
                                    onCopyId();
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }}
                            >
                                <span class={`codicon ${copied ? 'codicon-check' : 'codicon-copy'}`} />
                            </button>
                        </div>
                    </div>
                    <div class="more-info-entry">
                        <div class="more-info-entry-name">Publisher</div>
                        <div>{extension.namespace || ''}</div>
                    </div>
                    <div class="more-info-entry">
                        <div class="more-info-entry-name">Version</div>
                        <div>{currentVersion}</div>
                    </div>
                    {extension.downloadCount ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">Downloads</div>
                            <div>{extension.downloadCount.toLocaleString()}</div>
                        </div>
                    ) : null}
                    {manifest?.license ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">License</div>
                            <div>{manifest.license}</div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
