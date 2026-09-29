import { useEffect, useState } from 'preact/hooks';
import type { DetailState, DetailWebviewMessage } from '../types';
import { getWebviewApi } from '../api';
import { computeAvailableTabs } from './tabs';
import { EditorHeader } from './EditorHeader';
import { Navbar } from './Navbar';
import { MarkdownContent } from './MarkdownContent';
import { FeaturesPane } from './FeaturesPane';
import { DependenciesPane } from './DependenciesPane';
import { AdditionalDetails } from './AdditionalDetails';

export function DetailApp({ initialState }: { initialState: DetailState }) {
    const [state, setState] = useState(initialState);
    const [activeTab, setActiveTab] = useState('tab-details');
    const api = getWebviewApi();
    const post = (message: DetailWebviewMessage) => api?.postMessage(message);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const data = event.data as { type?: string; state?: DetailState } | undefined;
            if (data && data.type === 'detail:state' && data.state) {
                setState(data.state);
            }
        };
        window.addEventListener('message', onMessage);
        post({ command: 'ready' });
        return () => window.removeEventListener('message', onMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tabs = computeAvailableTabs(state);
    const effectiveActive = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0].id;

    const onAction = (action: string, version?: string) =>
        post({ command: action as DetailWebviewMessage['command'], version });
    const onCopyId = () => post({ command: 'copy', text: state.extension.id });
    const onOpenExternal = (url: string) => post({ command: 'openExternal', url });

    const renderPane = (id: string) => {
        switch (id) {
            case 'tab-features':
                return (
                    <div class="subcontent">
                        <FeaturesPane manifest={state.manifest} />
                    </div>
                );
            case 'tab-changelog':
                return (
                    <div class="subcontent markdown-body">
                        <MarkdownContent
                            html={state.changelogHtml ?? ''}
                            onOpenExternal={onOpenExternal}
                        />
                    </div>
                );
            case 'tab-dependencies':
                return (
                    <div class="subcontent">
                        <DependenciesPane manifest={state.manifest} />
                    </div>
                );
            default:
                return (
                    <div class="details-layout">
                        <div class="readme-container markdown-body">
                            <MarkdownContent html={state.readmeHtml} onOpenExternal={onOpenExternal} />
                        </div>
                        <div class="additional-details-container">
                            <AdditionalDetails
                                state={state}
                                onOpenExternal={onOpenExternal}
                                onCopyId={onCopyId}
                            />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div class="extension-editor">
            <div class="header">
                <EditorHeader state={state} onAction={onAction} onCopyId={onCopyId} />
            </div>
            <div class="body">
                <Navbar tabs={tabs} activeId={effectiveActive} onSelect={setActiveTab} />
                <div class="content">
                    {tabs.map((tab) => (
                        <div
                            id={tab.id}
                            class={`tab-pane${tab.id === effectiveActive ? ' active' : ''}`}
                        >
                            {renderPane(tab.id)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
