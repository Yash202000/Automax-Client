import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface MultiSelectOption {
  value: string;
  label: string;
  // Options sharing the same group render clustered under a header (e.g. a
  // parent Objective's name), in first-seen order — options without a group
  // render as a flat list, unchanged from before grouping existed.
  group?: string;
  // Marks the option that represents the group's own parent node (e.g. an
  // Objective itself). Rendered as the group's header row — bold,
  // unindented, and selectable — instead of a plain label, so the parent's
  // name appears exactly once rather than duplicated as a separate row
  // beneath its own header. Its child options (e.g. that Objective's
  // Processes) render indented beneath it.
  isParent?: boolean;
}

interface MultiSelectFilterProps {
  // Shown on the trigger button when nothing is selected, e.g. "All Criteria".
  placeholder: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}

// Checkbox multi-select dropdown matching the visual style of the plain
// native <select> filters elsewhere on the KPI Dashboard (same border/
// rounded/text-sm/focus-ring), for filters where multiple values must
// combine with OR logic (e.g. Criteria, Sub-Criteria).
export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  placeholder,
  options,
  selected,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parent/child cascade for hierarchical groups (a group with an isParent
  // option, e.g. an Objective and its Processes): toggling the parent checks
  // or unchecks all of its children with it; unchecking any child also
  // unchecks the parent (a still-checked parent would otherwise keep
  // matching that child's KPIs); and checking the last unchecked child
  // checks the parent too. Flat/non-hierarchical options toggle alone.
  const toggleValue = (value: string) => {
    const option = options.find((o) => o.value === value);
    const parent =
      option?.group !== undefined
        ? options.find((o) => o.isParent && o.group === option.group)
        : undefined;
    const children = parent
      ? options.filter((o) => o.group === parent.group && !o.isParent)
      : [];
    const isChecked = selected.includes(value);

    if (parent && option?.isParent) {
      const groupValues = [parent.value, ...children.map((c) => c.value)];
      if (isChecked) {
        onChange(selected.filter((v) => !groupValues.includes(v)));
      } else {
        onChange([
          ...selected,
          ...groupValues.filter((v) => !selected.includes(v)),
        ]);
      }
      return;
    }

    if (isChecked) {
      onChange(selected.filter((v) => v !== value && v !== parent?.value));
      return;
    }
    const next = [...selected, value];
    if (
      parent &&
      !next.includes(parent.value) &&
      children.every((c) => next.includes(c.value))
    ) {
      next.push(parent.value);
    }
    onChange(next);
  };

  const ungrouped = options.filter((o) => !o.group);
  // Each group's own parent option (isParent: true, e.g. an Objective) is
  // pulled out of `options` and rendered AS the group's header row itself —
  // selectable, not a plain label — so the parent's name appears exactly
  // once, never duplicated as a separate child-style row beneath its own
  // header. Groups with no designated parent option (e.g. Criteria/
  // Sub-Criteria, which aren't hierarchical) fall back to a plain text
  // header, unchanged from before.
  const groups: {
    name: string;
    parent?: MultiSelectOption;
    options: MultiSelectOption[];
  }[] = [];
  for (const option of options) {
    if (!option.group) continue;
    let group = groups.find((g) => g.name === option.group);
    if (!group) {
      group = { name: option.group, options: [] };
      groups.push(group);
    }
    if (option.isParent) {
      group.parent = option;
    } else {
      group.options.push(option);
    }
  }

  const renderCheckbox = (o: MultiSelectOption) => (
    <label
      key={o.value}
      className={`flex items-center gap-2 py-1.5 pe-3 text-sm cursor-pointer ${
        o.isParent
          ? "text-slate-700 dark:text-slate-200 font-semibold bg-slate-50 dark:bg-slate-900/40 ps-3 hover:bg-slate-100 dark:hover:bg-slate-900/60"
          : `text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${o.group ? "ps-7" : "ps-3"}`
      }`}
    >
      <input
        type="checkbox"
        checked={selected.includes(o.value)}
        onChange={() => toggleValue(o.value)}
        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="truncate">{o.label}</span>
    </label>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center gap-2 min-w-[11rem] justify-between"
      >
        <span className="truncate">
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-xs sticky top-0 bg-white dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-slate-500 dark:text-slate-400 hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="py-1">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No options</p>
            ) : (
              <>
                {ungrouped.map(renderCheckbox)}
                {groups.map((g) => (
                  <div key={g.name}>
                    {g.parent ? (
                      renderCheckbox(g.parent)
                    ) : (
                      <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                        {g.name}
                      </div>
                    )}
                    {g.options.map(renderCheckbox)}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectFilter;
