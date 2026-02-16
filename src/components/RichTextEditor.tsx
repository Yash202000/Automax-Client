import React, { useRef, useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link as LinkIcon
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Write your message here...',
    className = ''
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isUpdatingRef = useRef(false);

    useEffect(() => {
        if (editorRef.current && !isUpdatingRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            isUpdatingRef.current = true;
            onChange(editorRef.current.innerHTML);
            setTimeout(() => {
                isUpdatingRef.current = false;
            }, 0);
        }
    };

    const execCommand = (command: string, value: string | boolean = false) => {
        document.execCommand(command, false, value as string);
        editorRef.current?.focus();
        handleInput();
    };

    const createLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            execCommand('createLink', url);
        }
    };

    const toolbarButtons = [
        { icon: Bold, command: 'bold', title: 'Bold' },
        { icon: Italic, command: 'italic', title: 'Italic' },
        { icon: Underline, command: 'underline', title: 'Underline' },
        { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
        { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
        { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
        { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
        { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
    ];

    return (
        <div className={`flex flex-col border border-slate-300 rounded-lg overflow-hidden bg-white ${className}`}>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 bg-slate-50">
                {toolbarButtons.map(({ icon: Icon, command, title }) => (
                    <button
                        key={command}
                        type="button"
                        onClick={() => execCommand(command)}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title={title}
                    >
                        <Icon className="w-4 h-4 text-slate-600" />
                    </button>
                ))}
                <button
                    type="button"
                    onClick={createLink}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Insert Link"
                >
                    <LinkIcon className="w-4 h-4 text-slate-600" />
                </button>
            </div>

            {/* Editor */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="flex-1 p-3 min-h-[200px] outline-none overflow-y-auto prose prose-sm max-w-none text-slate-800"
                style={{ lineHeight: '1.6' }}
                data-placeholder={placeholder}
            />

            <style>{`
                [contentEditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    pointer-events: none;
                }
                [contentEditable]:focus {
                    outline: none;
                }
            `}</style>
        </div>
    );
};
