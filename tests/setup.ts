/**
 * Vitest global setup — polyfill browser APIs for Node environment.
 */

// Stub localStorage for tests that reference it
if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        get length() { return store.size; },
        key: (index: number) => [...store.keys()][index] ?? null,
    };
}
