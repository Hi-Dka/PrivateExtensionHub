export interface MarkdownContentProps {
    html: string;
    className?: string;
    onOpenExternal: (url: string) => void;
}

/** Host-rendered markdown (markdown-it), with external links bridged to the host. */
export function MarkdownContent({ html, className, onOpenExternal }: MarkdownContentProps) {
    return (
        <div
            class={className}
            dangerouslySetInnerHTML={{ __html: html }}
            onClick={(event: MouseEvent) => {
                const target = event.target as Element | null;
                const link = target?.closest('a[href^="http://"], a[href^="https://"]');
                if (link) {
                    event.preventDefault();
                    const href = link.getAttribute('href');
                    if (href) {
                        onOpenExternal(href);
                    }
                }
            }}
        />
    );
}
