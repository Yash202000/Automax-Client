import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { incidentApi } from "../../api/admin";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { publicUrl } from "../../utils/publicUrl";

interface MentionState {
  isActive: boolean;
  searchText: string;
}

export interface IncidentMentionTextareaProps {
  value?: string;
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  placeholder?: string;
  rows?: number;
  name?: string;
  className?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  disabled?: boolean;
  id?: string;
  filters?: {
    classification_ids?: string[];
    location_ids?: string[];
    currentIncident_ids?: string[];
  };
}

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const parseValueToHtml = (val: string) => {
  if (!val) return "";
  let html = escapeHtml(val);

  html = html.replace(/\n/g, "<br>");

  // Support old format for backwards compatibility
  html = html.replace(
    /@\{([^:]+):([^}]+)\}/g,
    (_match, incidentNumber, incidentId) => {
      const url = publicUrl(`/admin/incidents/${incidentId}`);
      return `<a href="${url}" class="text-[hsl(var(--primary))] hover:underline font-medium bg-[hsl(var(--primary)/0.1)] px-1 rounded-sm" contenteditable="false" data-incident-id="${incidentId}" data-incident-number="${incidentNumber}">${incidentNumber}</a>`;
    },
  );

  // Support new format: @[INC-1234](incident:uuid)
  html = html.replace(
    /@\[([^\]]+)\]\(incident:([^)]+)\)/g,
    (_match, incidentNumber, incidentId) => {
      const url = publicUrl(`/admin/incidents/${incidentId}`);
      return `<a href="${url}" class="text-[hsl(var(--primary))] hover:underline font-medium bg-[hsl(var(--primary)/0.1)] px-1 rounded-sm" contenteditable="false" data-incident-id="${incidentId}" data-incident-number="${incidentNumber}">${incidentNumber}</a>`;
    },
  );

  return html;
};

const getPlainText = (root: Node): string => {
  let result = "";
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === "A" && el.dataset.incidentId) {
        result += `@[${el.dataset.incidentNumber}](incident:${el.dataset.incidentId})`;
      } else if (el.tagName === "BR") {
        result += "\n";
      } else if (el.tagName === "DIV" || el.tagName === "P") {
        if (node.previousSibling) {
          result += "\n";
        }
        result += getPlainText(el);
      } else {
        result += getPlainText(el);
      }
    }
  }
  return result.replace(/\u00A0/g, " ");
};

export const IncidentMentionTextarea = React.forwardRef<
  HTMLDivElement,
  IncidentMentionTextareaProps
>((props, ref) => {
  const { t } = useTranslation();
  const [mention, setMention] = useState<MentionState>({
    isActive: false,
    searchText: "",
  });
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (mention.isActive && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [mention.isActive]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  const editorRef =
    (ref as React.MutableRefObject<HTMLDivElement>) || internalRef;

  const { data, isFetching } = useQuery({
    queryKey: ["incident-mention-search", mention.searchText],
    queryFn: () =>
      incidentApi.list({
        search: mention.searchText,
        limit: 10,
        record_type: "incident",
        classification_ids: props.filters?.classification_ids || [],
        location_ids: props.filters?.location_ids || [],
      }),
    enabled: mention.isActive,
    select: (response) => {
      if (
        props.filters?.currentIncident_ids?.length &&
        Array.isArray(response?.data)
      ) {
        return {
          ...response,
          data: response.data.filter(
            (item) => !props.filters?.currentIncident_ids?.includes(item.id),
          ),
        };
      }

      return response;
    },
  });

  const incidents = data?.data || [];

  const emitChange = useCallback(() => {
    if (props.onChange && editorRef.current) {
      isUpdatingRef.current = true;
      const plainText = getPlainText(editorRef.current);
      props.onChange({
        target: { value: plainText, name: props.name },
      });
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [props, editorRef]);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      const currentPlain = getPlainText(editorRef.current);
      if (currentPlain !== props.value) {
        editorRef.current.innerHTML = parseValueToHtml(props.value || "");
      }
    }
  }, [props.value, editorRef]);

  const handleSelectIncident = useCallback(
    (incident: any) => {
      if (!mention.isActive) return;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || "";
          const match = text
            .substring(0, range.startOffset)
            .match(/(^|\s)@([^\s]*)$/);

          if (match) {
            const start = range.startOffset - match[2].length - 1;
            range.setStart(node, start);
            range.deleteContents();

            const link = document.createElement("a");
            link.href = publicUrl(`/admin/incidents/${incident.id}`);
            link.className =
              "text-[hsl(var(--primary))] hover:underline font-medium bg-[hsl(var(--primary)/0.1)] px-1 rounded-sm";
            link.contentEditable = "false";
            link.dataset.incidentId = incident.id;
            link.dataset.incidentNumber = incident.incident_number;
            link.textContent = incident.incident_number;
            link.target = "_blank";

            range.insertNode(link);

            const space = document.createTextNode("\u00A0");
            range.setStartAfter(link);
            range.insertNode(space);

            range.setStartAfter(space);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            emitChange();
          }
        }
      }

      setMention({ isActive: false, searchText: "" });
      editorRef.current?.focus();
    },
    [mention, editorRef, emitChange],
  );

  const handleInput = () => {
    emitChange();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        const textBeforeCursor = text.substring(0, range.startOffset);
        const match = textBeforeCursor.match(/(^|\s)@([^\s]*)$/);

        if (match) {
          setMention({
            isActive: true,
            searchText: match[2],
          });
          return;
        }
      }
    }
    setMention({ isActive: false, searchText: "" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mention.isActive) {
      if (e.key === "Escape") {
        setMention({ isActive: false, searchText: "" });
      } else if (e.key === "Enter" && incidents.length > 0) {
        e.preventDefault();
        handleSelectIncident(incidents[0]);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertLineBreak");
    }
    if (props.onKeyDown) props.onKeyDown(e);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!dropdownRef.current ||
          !dropdownRef.current.contains(e.target as Node))
      ) {
        setMention((m) => (m.isActive ? { ...m, isActive: false } : m));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [containerRef]);

  const { value, onChange, rows, ...restProps } = props;

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <div
        {...restProps}
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`${props.className || ""} min-h-[80px] overflow-y-auto whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-[hsl(var(--muted-foreground))]`}
        data-placeholder={props.placeholder || t("common.tagIncident")}
      />
      {mention.isActive &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto"
            style={dropdownStyle}
          >
            {isFetching ? (
              <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />{" "}
                {t("common.loading")}
              </div>
            ) : incidents.length > 0 ? (
              <ul className="py-1">
                {incidents.map((inc) => (
                  <li
                    key={inc.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectIncident(inc);
                    }}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-medium text-sm text-[hsl(var(--primary))]">
                      {inc.incident_number}
                    </span>
                    <span className="text-xs text-gray-500 truncate ml-2 max-w-[200px]">
                      {inc.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                {t("common.noMatchingIncidents")}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
});

IncidentMentionTextarea.displayName = "IncidentMentionTextarea";
