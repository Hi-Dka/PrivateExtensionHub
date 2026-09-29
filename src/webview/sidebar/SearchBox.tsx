import { useState } from 'preact/hooks';

export interface SearchBoxProps {
    initialQuery: string;
    onSearch: (query: string) => void;
    onClear: () => void;
}

/**
 * Reference DOM: `.search-box > input.search-input` plus the clear button.
 * Every keystroke is forwarded immediately; the host debounces by 500ms.
 */
export function SearchBox({ initialQuery, onSearch, onClear }: SearchBoxProps) {
    const [value, setValue] = useState(initialQuery);
    const [showClear, setShowClear] = useState(!!initialQuery);

    return (
        <div class="search-box">
            <input
                type="text"
                class="search-input"
                id="searchInput"
                placeholder="Search Extensions in Open VSX"
                value={value}
                autofocus
                onInput={(event: Event) => {
                    const query = (event.target as HTMLInputElement).value;
                    setValue(query);
                    setShowClear(!!query);
                    onSearch(query);
                }}
                onKeyDown={(event: KeyboardEvent) => {
                    if (event.key === 'Escape') {
                        setValue('');
                        setShowClear(false);
                        onClear();
                    }
                }}
            />
            <button
                class="search-clear-btn"
                id="searchClearBtn"
                title="Clear Search"
                style={showClear ? 'display: flex;' : undefined}
                onClick={() => {
                    setValue('');
                    setShowClear(false);
                    onClear();
                }}
            >
                <span class="codicon codicon-close" />
            </button>
        </div>
    );
}
