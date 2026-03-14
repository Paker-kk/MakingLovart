import type { GenerationHistoryItem } from '../types';

const STORAGE_KEY = 'making.generationHistory.v1';
const MAX_HISTORY_ITEMS = 18;

export const loadGenerationHistory = (): GenerationHistoryItem[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const saveGenerationHistory = (items: GenerationHistoryItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const addGenerationHistoryItem = (
    items: GenerationHistoryItem[],
    item: GenerationHistoryItem
): GenerationHistoryItem[] => {
    const next = [item, ...items.filter(existing => existing.dataUrl !== item.dataUrl)].slice(0, MAX_HISTORY_ITEMS);
    saveGenerationHistory(next);
    return next;
};
