import type { DetailTab } from './tabs';

export interface NavbarProps {
    tabs: DetailTab[];
    activeId: string;
    onSelect: (id: string) => void;
}

/** Reference DOM: `.navbar > .monaco-action-bar > ul > li.action-item > a.action-label`. */
export function Navbar({ tabs, activeId, onSelect }: NavbarProps) {
    return (
        <div class="navbar">
            <div class="monaco-action-bar">
                <ul class="actions-container" id="navbarItems">
                    {tabs.map((tab) => (
                        <li class="action-item">
                            <a
                                class={`action-label${tab.id === activeId ? ' checked' : ''}`}
                                data-tab={tab.id}
                                onClick={() => onSelect(tab.id)}
                            >
                                {tab.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
