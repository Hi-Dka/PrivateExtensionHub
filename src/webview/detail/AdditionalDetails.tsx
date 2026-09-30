import { useState } from 'preact/hooks';
import type { DetailState } from '../types';
import { formatDate, formatByteSize } from '../shared/format';

export interface AdditionalDetailsProps {
    state: DetailState;
    onOpenExternal: (url: string) => void;
    onCopyId: () => void;
}

/**
 * Reference DOM: `.additional-details-content` with Categories, Resources,
 * and distinct Installation and Marketplace sections aligned with native VS Code.
 */
export function AdditionalDetails({ state, onOpenExternal, onCopyId }: AdditionalDetailsProps) {
    const { extension, manifest } = state;
    const [copied, setCopied] = useState(false);

    const currentVersion = state.isInstalled
        ? state.installedVersion || extension.installedVersion || extension.version
        : extension.version;
    const cleanRegistry = state.registryUrl.replace(/\/+$/, '');
    const vsixDownloadUrl =
        extension.downloadUrl ||
        `${cleanRegistry}/api/${extension.namespace}/${extension.name}/${currentVersion}/file/${extension.namespace}.${extension.name}-${currentVersion}.vsix`;

    const categories =
        extension.categories && extension.categories.length > 0
            ? extension.categories
            : (manifest?.categories ?? []);

    const repositoryUrl =
        extension.repositoryUrl ||
        (typeof manifest?.repository === 'string'
            ? manifest.repository
            : manifest?.repository?.url);

    const bugsUrl =
        extension.bugsUrl ||
        (typeof manifest?.bugs === 'string' ? manifest.bugs : manifest?.bugs?.url);

    const homepageUrl = extension.homepageUrl || manifest?.homepage;
    const license = extension.license || manifest?.license;
    const publisherName =
        extension.publisherDisplayName || extension.publisherName || extension.namespace || '';

    const lastReleased = extension.lastReleasedDate ?? extension.timestamp;
    const packageSize = extension.packageSize ?? extension.size;

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

    const identifierEntry = (
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
    );

    return (
        <div class="additional-details-content">
            {categories.length > 0 ? (
                <div class="categories-container additional-details-element">
                    <div class="additional-details-title">Categories</div>
                    <div class="categories">
                        {categories.map((category: string) => (
                            <span class="category" key={category}>
                                {category}
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}

            <div class="resources-container additional-details-element">
                <div class="additional-details-title">Resources</div>
                <div class="resources">
                    {repositoryUrl ? resourceLink(repositoryUrl, 'Repository', 'codicon-repo') : null}
                    {bugsUrl ? resourceLink(bugsUrl, 'Issues', 'codicon-issues') : null}
                    {homepageUrl ? resourceLink(homepageUrl, 'Homepage', 'codicon-home') : null}
                    {resourceLink(vsixDownloadUrl, 'Download VSIX', 'codicon-link-external')}
                </div>
            </div>

            {state.isInstalled ? (
                <div class="installation-container additional-details-element">
                    <div class="additional-details-title">Installation</div>
                    <div class="more-info">
                        {identifierEntry}
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">Version</div>
                            <div>{currentVersion}</div>
                        </div>
                        {extension.lastUpdated ? (
                            <div class="more-info-entry">
                                <div class="more-info-entry-name">Last Updated</div>
                                <div>{formatDate(extension.lastUpdated)}</div>
                            </div>
                        ) : null}
                        {extension.installedSize ? (
                            <div class="more-info-entry">
                                <div class="more-info-entry-name">Size</div>
                                <div>{formatByteSize(extension.installedSize)}</div>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div class="more-info-container additional-details-element">
                <div class="additional-details-title">Marketplace</div>
                <div class="more-info">
                    {!state.isInstalled ? identifierEntry : null}
                    {!state.isInstalled ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">Publisher</div>
                            <div>
                                <span>{publisherName}</span>
                                {extension.verified ? (
                                    <span
                                        class="codicon codicon-verified"
                                        title="Verified Publisher"
                                        style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                                    />
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                    {!state.isInstalled ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">Version</div>
                            <div>{currentVersion}</div>
                        </div>
                    ) : null}
                    {extension.publishedDate ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">Published</div>
                            <div>{formatDate(extension.publishedDate)}</div>
                        </div>
                    ) : null}
                    {lastReleased ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">Last Released</div>
                            <div>{formatDate(lastReleased)}</div>
                        </div>
                    ) : null}
                    {packageSize ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">Size</div>
                            <div>{formatByteSize(packageSize)}</div>
                        </div>
                    ) : null}
                    {extension.downloadCount ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">Downloads</div>
                            <div>{extension.downloadCount.toLocaleString()}</div>
                        </div>
                    ) : null}
                    {license ? (
                        <div class="more-info-entry">
                            <div class="more-info-entry-name">License</div>
                            <div>{license}</div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
