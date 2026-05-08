import React, { useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className = "",
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("common.writeYourMessageHere");
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (
      editorRef.current &&
      !isUpdatingRef.current &&
      editorRef.current.innerHTML !== value
    ) {
      editorRef.current.innerHTML = value || "";
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
    const url = prompt(t("common.enterUrl"));
    if (url) {
      execCommand("createLink", url);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: "bold", title: t("common.bold") },
    { icon: Italic, command: "italic", title: t("common.italic") },
    { icon: Underline, command: "underline", title: t("common.underline") },
    {
      icon: List,
      command: "insertUnorderedList",
      title: t("common.bulletList"),
    },
    {
      icon: ListOrdered,
      command: "insertOrderedList",
      title: t("common.numberedList"),
    },
    { icon: AlignLeft, command: "justifyLeft", title: t("common.alignLeft") },
    {
      icon: AlignCenter,
      command: "justifyCenter",
      title: t("common.alignCenter"),
    },
    {
      icon: AlignRight,
      command: "justifyRight",
      title: t("common.alignRight"),
    },
  ];

  return (
    <div
      className={`flex flex-col border border-border rounded-lg overflow-hidden bg-background ${className}`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-background">
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
          title={t("common.insertLink")}
        >
          <LinkIcon className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 p-3 min-h-[200px] outline-none overflow-y-auto prose prose-sm max-w-none "
        style={{ lineHeight: "1.6" }}
        data-placeholder={resolvedPlaceholder}
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
