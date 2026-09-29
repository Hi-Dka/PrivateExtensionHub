export interface WebviewApi {
    postMessage(message: unknown): void;
}

declare global {
    interface Window {
        acquireVsCodeApi?: () => WebviewApi;
    }
}

let cachedApi: WebviewApi | undefined;
let apiResolved = false;

/**
 * The VS Code webview API.
 *
 * `acquireVsCodeApi()` may only be called once per webview document — calling
 * it again throws "An instance of the VS Code API has already been acquired".
 * Acquire it lazily on first use and cache it for all later renders.
 */
export function getWebviewApi(): WebviewApi | undefined {
    if (!apiResolved) {
        apiResolved = true;
        cachedApi = typeof window !== 'undefined' ? window.acquireVsCodeApi?.() : undefined;
    }
    return cachedApi;
}
