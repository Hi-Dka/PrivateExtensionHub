import type { DetailState } from '../types';

/**
 * Feature contributions rendered from the manifest (settings, commands,
 * keybindings) — same markup the host used before the migration.
 */
export function FeaturesPane({ manifest }: { manifest?: DetailState['manifest'] }) {
    const contributes = manifest?.contributes;
    if (!contributes) {
        return <div class="empty-state">No feature contributions.</div>;
    }

    const sections: unknown[] = [];

    // 1. Configuration settings
    const configConfigs = Array.isArray(contributes.configuration)
        ? contributes.configuration
        : contributes.configuration
          ? [contributes.configuration]
          : [];
    const properties: Array<{ key: string; default?: string; description?: string }> = [];
    for (const cfg of configConfigs) {
        if (cfg.properties) {
            for (const [propKey, propVal] of Object.entries(cfg.properties)) {
                properties.push({
                    key: propKey,
                    default: propVal.default !== undefined ? JSON.stringify(propVal.default) : '',
                    description: propVal.description || '',
                });
            }
        }
    }
    if (properties.length > 0) {
        sections.push(
            <div class="features-section">
                <div class="features-header">
                    Settings <span class="features-count">({properties.length})</span>
                </div>
                <div class="features-list">
                    {properties.map((property) => (
                        <div class="feature-item">
                            <div class="feature-item-header">
                                <span class="feature-item-key">
                                    <code>{property.key}</code>
                                </span>
                                {property.default ? (
                                    <span class="feature-item-default">
                                        Default: <code>{property.default}</code>
                                    </span>
                                ) : null}
                            </div>
                            {property.description ? (
                                <div class="feature-item-desc">{property.description}</div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>,
        );
    }

    // 2. Commands
    const commands = contributes.commands || [];
    if (commands.length > 0) {
        sections.push(
            <div class="features-section">
                <div class="features-header">
                    Commands <span class="features-count">({commands.length})</span>
                </div>
                <div class="features-list">
                    {commands.map((command) => (
                        <div class="feature-item">
                            <div class="feature-item-header">
                                <span class="feature-item-key">
                                    <code>{command.command}</code>
                                </span>
                            </div>
                            <div class="feature-item-desc">
                                {command.category ? `${command.category}: ${command.title}` : command.title}
                            </div>
                        </div>
                    ))}
                </div>
            </div>,
        );
    }

    // 3. Keybindings
    const keybindings = (contributes as any).keybindings || [];
    if (keybindings.length > 0) {
        sections.push(
            <div class="features-section">
                <div class="features-header">
                    Keybindings <span class="features-count">({keybindings.length})</span>
                </div>
                <div class="features-list">
                    {keybindings.map((keybinding: any) => {
                        const keyStr = keybinding.mac || keybinding.key || '';
                        return (
                            <div class="feature-item">
                                <div class="feature-item-header">
                                    <span class="feature-item-key">
                                        <code>{keybinding.command}</code>
                                    </span>
                                    {keyStr ? (
                                        <span class="feature-item-keybinding">
                                            <code>{keyStr}</code>
                                        </span>
                                    ) : null}
                                </div>
                                {keybinding.when ? (
                                    <div class="feature-item-desc">
                                        When: <code>{keybinding.when}</code>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>,
        );
    }

    if (sections.length === 0) {
        return <div class="empty-state">No feature contributions.</div>;
    }

    return <>{sections}</>;
}
