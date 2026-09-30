import type { DetailState } from '../types';

export interface DetailTab {
    id: string;
    label: string;
}

/** Same rule as the host used before the migration. */
export function hasFeatureContributions(manifest?: DetailState['manifest']): boolean {
    if (!manifest || !manifest.contributes) {
        return false;
    }
    const { contributes } = manifest;
    if (contributes.configuration) {
        const configs = Array.isArray(contributes.configuration)
            ? contributes.configuration
            : [contributes.configuration];
        for (const cfg of configs) {
            if (cfg.properties && Object.keys(cfg.properties).length > 0) {
                return true;
            }
        }
    }
    if (contributes.commands && contributes.commands.length > 0) {
        return true;
    }
    if (contributes.keybindings && contributes.keybindings.length > 0) {
        return true;
    }
    return false;
}

export function hasDependencies(manifest?: DetailState['manifest']): boolean {
    return Boolean(
        (manifest?.extensionDependencies && manifest.extensionDependencies.length > 0) ||
            (manifest?.extensionPack && manifest.extensionPack.length > 0),
    );
}

/** Tabs are emitted dynamically; Details is always present. */
export function computeAvailableTabs(state: DetailState): DetailTab[] {
    const tabs: DetailTab[] = [{ id: 'tab-details', label: 'Details' }];
    if (hasFeatureContributions(state.manifest)) {
        tabs.push({ id: 'tab-features', label: 'Features' });
    }
    if (state.changelogHtml) {
        tabs.push({ id: 'tab-changelog', label: 'Changelog' });
    }
    if (hasDependencies(state.manifest)) {
        tabs.push({ id: 'tab-dependencies', label: 'Dependencies' });
    }
    return tabs;
}
