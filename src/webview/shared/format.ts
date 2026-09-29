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
