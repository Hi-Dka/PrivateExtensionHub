import type { SidebarItem } from '../types';

/**
 * Shared formatting and visibility rules for sidebar metadata.
 * Values are ported from the pinned VS Code 1.139.1 reference:
 * - InstallCountWidget.getInstallLabel (strictly > 1,000,000 / > 1,000)
 * - RatingsWidget (round to halves; hidden for installed extensions or without a rating count)
 */

export function formatInstallCount(count?: number): string {
    if (!count || count <= 0) {
        return '';
    }
    if (count > 1_000_000) {
        return `${Math.floor(count / 100_000) / 10}M`;
    }
    if (count > 1_000) {
        return `${Math.floor(count / 1_000)}K`;
    }
    return String(count);
}

export function formatRating(rating?: number): string {
    if (rating === undefined || rating === null || rating <= 0) {
        return '';
    }
    return String(Math.round(rating * 2) / 2);
}

export function shouldShowInstallCount(item: SidebarItem): boolean {
    return !item.isInstalled && !!item.info.downloadCount && item.info.downloadCount > 0;
}

export function shouldShowRating(item: SidebarItem): boolean {
    const { rating, ratingCount } = item.info;
    return (
        !item.isInstalled &&
        rating !== undefined &&
        rating !== null &&
        rating > 0 &&
        (ratingCount ?? 0) > 0
    );
}

/**
 * Formats an ISO timestamp or date string into a localized human-readable date.
 */
export function formatDate(timestamp?: string): string {
    if (!timestamp) {
        return '';
    }
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return timestamp;
        }
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return timestamp;
    }
}

/**
 * Formats byte size into human-readable B / KB / MB.
 */
export function formatByteSize(bytes?: number): string {
    if (bytes === undefined || bytes === null || bytes <= 0) {
        return '';
    }
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
}
