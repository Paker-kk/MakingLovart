import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import ReactDOM from 'react-dom/client';
import MentionList, { type MentionItem, type MentionListHandle } from './MentionList';
import { CanvasMentionNode, extractMentions, editorJSONToText } from './CanvasMentionExtension';
import type { MentionData } from './CanvasMentionExtension';

function buildSuggestionExtension(getItems: (query: string) => MentionItem[]) {
    return Extension.create({
        name: 'canvasMentionSuggestion',
        addProseMirrorPlugins() {
            return [
                Suggestion({
                    editor: this.editor,
                    char: '@',
                    allowSpaces: false,
                    items: ({ query }) => getItems(query),
                    render() {
                        let reactRoot: ReactDOM.Root | null = null;
                        let container: HTMLElement | null = null;
                        let popup: TippyInstance[] | null = null;
                        let componentRef: React.RefObject<MentionListHandle> = React.createRef();

                        return {
                            onStart(props) {
                                container = document.createElement('div');
                                document.body.appendChild(container);

                                componentRef = React.createRef<MentionListHandle>();
                                reactRoot = ReactDOM.createRoot(container);
                                reactRoot.render(
                                    <MentionList
                                        ref={componentRef}
                                        items={props.items as MentionItem[]}
                                        command={props.command}
                                    />
                                );

                                popup = tippy('body', {
                                    getReferenceClientRect: props.clientRect as () => DOMRect,
                                    appendTo: () => document.body,
                                    content: container,
                                    showOnCreate: true,
                                    interactive: true,
                                    trigger: 'manual',
                                    placement: 'bottom-start',
                                    theme: 'light-border',
                                    arrow: false,
                                    offset: [0, 4],
                                    zIndex: 9999,
                                    popperOptions: {
                                        modifiers: [
                                            { name: 'flip', enabled: true },
                                            { name: 'preventOverflow', enabled: true },
                                        ],
                                    },
                                });
                            },
                            onUpdate(props) {
                                reactRoot?.render(
                                    <MentionList
                                        ref={componentRef}
                                        items={props.items as MentionItem[]}
                                        command={props.command}
                                    />
                                );
                                if (popup?.[0] && props.clientRect) {
                                    popup[0].setProps({
                                        getReferenceClientRect: props.clientRect as () => DOMRect,
                                    });
                                }
                            },
                            onKeyDown(props) {
                                if (props.event.key === 'Escape') {
                                    popup?.[0]?.hide();
                                    return true;
                                }
                                return componentRef.current?.onKeyDown(props) ?? false;
                            },
                            onExit() {
                                popup?.[0]?.destroy();
                                popup = null;
                                setTimeout(() => {
                                    reactRoot?.unmount();
                                    container?.remove();
                                }, 0);
                            },
                        };
                    },
                    command({ editor, range, props }) {
                        const item = props as MentionItem;
                        editor
                            .chain()
                            .focus()
                            .deleteRange(range)
                            .insertContent({
                                type: 'canvasMention',
                                attrs: {
                                    id: item.id,
                                    label: item.label,
                                    thumbnail: item.thumbnail,
                                    elementType: item.elementType,
                                },
                            })
                            .insertContent(' ')
                            .run();
                    },
                }),
            ];
        },
    });
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export interface RichPromptEditorHandle {
    clear: () => void;
    focus: () => void;
    getJSON: () => Record<string, unknown>;
    getText: () => string;
    getMentions: () => MentionData[];
    insertMention: (item: MentionItem) => void;
}

export interface RichPromptEditorProps {
    value?: string;
    canvasItems: MentionItem[];
    placeholder?: string;
    disabled?: boolean;
    onTextChange?: (plainText: string, json: Record<string, unknown>) => void;
    onSubmit?: () => void;
    initialText?: string;
    minHeightPx?: number;
    maxHeightPx?: number;
}

const RichPromptEditor = forwardRef<RichPromptEditorHandle, RichPromptEditorProps>(
    (
        {
            value,
            canvasItems,
            placeholder = '输入提示词，输入 @ 绑定画布元素...',
            disabled,
            onTextChange,
            onSubmit,
            initialText,
            minHeightPx = 56,
            maxHeightPx = 300,
        },
        ref
    ) => {
        const canvasItemsRef = useRef(canvasItems);
        useEffect(() => {
            canvasItemsRef.current = canvasItems;
        }, [canvasItems]);

        const getFilteredItems = useCallback((query: string): MentionItem[] => {
            const q = query.toLowerCase();
            return canvasItemsRef.current.filter(
                item =>
                    item.label.toLowerCase().includes(q) ||
                    item.elementType.toLowerCase().includes(q)
            );
        }, []);

        const editor = useEditor({
            extensions: [
                StarterKit.configure({
                    bold: false,
                    italic: false,
                    strike: false,
                    code: false,
                    blockquote: false,
                    heading: false,
                    codeBlock: false,
                    bulletList: false,
                    orderedList: false,
                    listItem: false,
                    horizontalRule: false,
                }),
                CanvasMentionNode,
                buildSuggestionExtension(getFilteredItems),
            ],
            content: value
                ? `<p>${escapeHtml(value).replace(/\n/g, '<br/>')}</p>`
                : initialText
                    ? `<p>${escapeHtml(initialText).replace(/\n/g, '<br/>')}</p>`
                    : '<p></p>',
            editable: !disabled,
            editorProps: {
                attributes: {
                    class: 'rich-prompt-editor',
                    spellcheck: 'false',
                    'data-placeholder': placeholder,
                },
                handleKeyDown(_, event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        onSubmit?.();
                        return true;
                    }
                    return false;
                },
            },
            onUpdate({ editor }) {
                const json = editor.getJSON() as Record<string, unknown>;
                const text = editorJSONToText(json);
                onTextChange?.(text, json);
            },
        });

        const syncAutoHeight = useCallback(() => {
            const dom = editor?.view?.dom as HTMLElement | undefined;
            if (!dom) return;
            dom.style.height = 'auto';
            const nextHeight = Math.min(maxHeightPx, Math.max(minHeightPx, dom.scrollHeight));
            dom.style.height = `${nextHeight}px`;
            dom.style.overflowY = dom.scrollHeight > maxHeightPx ? 'auto' : 'hidden';
        }, [editor, maxHeightPx, minHeightPx]);

        useEffect(() => {
            if (!editor) return;
            syncAutoHeight();
        }, [editor, syncAutoHeight]);

        useEffect(() => {
            if (!editor) return;
            editor.setEditable(!disabled);
        }, [disabled, editor]);

        useEffect(() => {
            if (!editor) return;
            const currentText = editorJSONToText(editor.getJSON() as Record<string, unknown>);
            const nextText = value ?? '';
            if (currentText !== nextText) {
                editor.commands.setContent(`<p>${escapeHtml(nextText).replace(/\n/g, '<br/>')}</p>`, false);
            }
            syncAutoHeight();
        }, [value, editor, syncAutoHeight]);

        useEffect(() => {
            const dom = editor?.view?.dom as HTMLElement | undefined;
            if (!dom) return;
            dom.setAttribute('data-placeholder', placeholder);
        }, [editor, placeholder]);

        useImperativeHandle(ref, () => ({
            clear() {
                editor?.commands.clearContent(true);
                syncAutoHeight();
            },
            focus() {
                editor?.commands.focus('end');
            },
            getJSON() {
                return (editor?.getJSON() ?? {}) as Record<string, unknown>;
            },
            getText() {
                const json = editor?.getJSON() as Record<string, unknown> | undefined;
                return json ? editorJSONToText(json) : '';
            },
            getMentions() {
                const json = editor?.getJSON() as Record<string, unknown> | undefined;
                return json ? extractMentions(json) : [];
            },
            insertMention(item) {
                if (!editor) return;
                editor
                    .chain()
                    .focus('end')
                    .insertContent({
                        type: 'canvasMention',
                        attrs: {
                            id: item.id,
                            label: item.label,
                            thumbnail: item.thumbnail,
                            elementType: item.elementType,
                        },
                    })
                    .insertContent(' ')
                    .run();
                syncAutoHeight();
            },
        }));

        return (
            <>
                <style>{editorStyles(minHeightPx, maxHeightPx)}</style>
                <EditorContent editor={editor} />
            </>
        );
    }
);

RichPromptEditor.displayName = 'RichPromptEditor';
export default RichPromptEditor;

function editorStyles(minHeightPx: number, maxHeightPx: number): string {
    return `
.rich-prompt-editor {
    min-height: ${Math.max(32, minHeightPx)}px;
    max-height: ${Math.max(minHeightPx, maxHeightPx)}px;
    width: 100%;
    overflow-y: auto;
    outline: none;
    font-size: 14px;
    line-height: 1.55;
    color: #111827;
    caret-color: #111827;
    padding: 0 2px;
    word-break: break-word;
    white-space: pre-wrap;
    background: transparent;
    transition: height 160ms ease;
}

.rich-prompt-editor p {
    margin: 0;
    padding: 0;
}

.rich-prompt-editor:empty:before,
.rich-prompt-editor p:first-child:empty:before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
}

.tippy-box[data-theme~='light-border'] {
    background-color: transparent;
    box-shadow: none;
    border: none;
    padding: 0;
}

.tippy-box[data-theme~='light-border'] .tippy-content {
    padding: 0;
}

.rich-prompt-editor::-webkit-scrollbar {
    width: 4px;
}

.rich-prompt-editor::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 2px;
}
`;
}
