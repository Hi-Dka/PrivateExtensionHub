export interface EmptyStateProps {
    message: string | null;
}

/** Reference DOM: `.message-container` > `.message` (hidden when there is no message). */
export function EmptyState({ message }: EmptyStateProps) {
    return (
        <div class="message-container" style={message ? undefined : 'display: none;'}>
            <div class="message">{message ?? ''}</div>
        </div>
    );
}
