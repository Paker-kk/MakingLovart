import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WorkspaceMode } from '../../types';

type PromptScope = 'global' | 'node';

interface WorkspaceStoreState {
  workspaceMode: WorkspaceMode;
  focusedNodeId: string | null;
  promptScope: PromptScope;
  nodePromptDraft: string;
  lastCanvasBoardId: string | null;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  toggleWorkspaceMode: () => void;
  setFocusedNodeId: (nodeId: string | null) => void;
  setPromptScope: (scope: PromptScope) => void;
  setNodePromptDraft: (draft: string) => void;
  setLastCanvasBoardId: (boardId: string | null) => void;
  resetNodeSession: () => void;
}

const initialState = {
  workspaceMode: 'whiteboard' as WorkspaceMode,
  focusedNodeId: null,
  promptScope: 'global' as PromptScope,
  nodePromptDraft: '',
  lastCanvasBoardId: null,
};

export const useWorkspaceStore = create<WorkspaceStoreState>()(
  persist(
    (set) => ({
      ...initialState,
      setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
      toggleWorkspaceMode: () =>
        set((state) => ({
          workspaceMode: state.workspaceMode === 'whiteboard' ? 'node' : 'whiteboard',
        })),
      setFocusedNodeId: (nodeId) => set({ focusedNodeId: nodeId }),
      setPromptScope: (scope) => set({ promptScope: scope }),
      setNodePromptDraft: (draft) => set({ nodePromptDraft: draft }),
      setLastCanvasBoardId: (boardId) => set({ lastCanvasBoardId: boardId }),
      resetNodeSession: () =>
        set({
          focusedNodeId: null,
          promptScope: 'global',
          nodePromptDraft: '',
        }),
    }),
    {
      name: 'making.workspace.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        workspaceMode: state.workspaceMode,
        focusedNodeId: state.focusedNodeId,
        promptScope: state.promptScope,
        nodePromptDraft: state.nodePromptDraft,
        lastCanvasBoardId: state.lastCanvasBoardId,
      }),
    },
  ),
);