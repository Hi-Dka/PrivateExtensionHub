import type { SidebarItem } from '../types';
import { EmptyState } from '../shared/EmptyState';
import { ExtensionCard, EXTENSION_ROW_HEIGHT } from './ExtensionCard';

export interface ExtensionListProps {
    items: SidebarItem[];
    isLoading: boolean;
    emptyMessage: string | null;
    onOpenDetail: (id: string) => void;
    onAction: (action: string, id?: string, version?: string) => void;
    onContextMenu: (event: MouseEvent, item: SidebarItem) => void;
}

/** Placeholder rows while the list has no data yet (native loading state). */
export const LOADING_PLACEHOLDER_COUNT = 8;

function LoadingRows() {
    return (
        <>
            {Array.from({ length: LOADING_PLACEHOLDER_COUNT }, (_, index) => (
                <div
                    class="monaco-list-row"
                    data-extension-id={`__loading_${index}`}
                    style={`top: ${index * EXTENSION_ROW_HEIGHT}px; height: ${EXTENSION_ROW_HEIGHT}px;`}
                >
                    <div class="extension-list-item loading" aria-hidden="true" />
                </div>
            ))}
        </>
    );
}

/**
 * Reference DOM: `.extensions > .monaco-list > .monaco-list-rows` with
 * absolutely positioned rows (top = index * 72) plus the empty message.
 */
export function ExtensionList({
    items,
    isLoading,
    emptyMessage,
    onOpenDetail,
    onAction,
    onContextMenu,
}: ExtensionListProps) {
    const showLoading = isLoading && items.length === 0;
    const rowCount = showLoading ? LOADING_PLACEHOLDER_COUNT : items.length;

    return (
        <div class="extensions">
            <div class="monaco-list">
                <div class="monaco-list-rows" style={`height: ${rowCount * EXTENSION_ROW_HEIGHT}px;`}>
                    {showLoading ? (
                        <LoadingRows />
                    ) : (
                        items.map((item, index) => (
                            <ExtensionCard
                                item={item}
                                top={index * EXTENSION_ROW_HEIGHT}
                                onOpenDetail={onOpenDetail}
                                onAction={onAction}
                                onContextMenu={onContextMenu}
                            />
                        ))
                    )}
                </div>
            </div>
            <EmptyState message={emptyMessage} />
        </div>
    );
}
