import type { DetailState } from '../types';

/** Dependency list — same markup the host used before the migration. */
export function DependenciesPane({ manifest }: { manifest?: DetailState['manifest'] }) {
    const dependencies = manifest?.extensionDependencies;
    if (!dependencies || dependencies.length === 0) {
        return <div class="empty-state">No dependencies.</div>;
    }

    return (
        <ul class="dependencies-list">
            {dependencies.map((dependency) => (
                <li class="dependency-item">
                    <span class="dependency-icon">
                        <i class="codicon codicon-package" />
                    </span>
                    <span class="dependency-id">{dependency}</span>
                </li>
            ))}
        </ul>
    );
}
