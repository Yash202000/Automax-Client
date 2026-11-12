import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame, MapPin, Phone, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../../components/ui/Modal";
import { DUMMY_FIRE_STATIONS } from "../../api/dispatcher";

/**
 * Pick additional fire stations to associate with an incident (DUMMY data).
 * Stations already associated are not offered.
 */
export function AssociateFireStationsModal({
  associatedIds,
  onClose,
  onConfirm,
}: {
  associatedIds: string[];
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onConfirm: (ids: string[]) => void;
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DUMMY_FIRE_STATIONS.filter(
      (s) =>
        !associatedIds.includes(s.id) &&
        (!q ||
          [s.name, s.name_ar, s.location_name, s.address].some((v) =>
            v?.toLowerCase().includes(q),
          )),
    );
  }, [associatedIds, query]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader className="flex items-center gap-3 py-3.5 px-6 border-b border-[hsl(var(--border))]">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
          <Flame className="w-5 h-5" />
        </div>
        <ModalTitle>
          {t(
            "dispatcher.associateMoreFireStations",
            "Associate more fire stations",
          )}
        </ModalTitle>
      </ModalHeader>
      <ModalBody className="p-0">
        <div className="relative border-b border-[hsl(var(--border))] p-3">
          <Search className="pointer-events-none absolute start-5 top-5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search", "Search")}
            className="h-9 w-full rounded-md border border-[hsl(var(--border))] bg-transparent ps-8 pe-2 text-sm outline-none"
          />
        </div>
        <ul className="max-h-[50vh] divide-y divide-[hsl(var(--border))] overflow-y-auto">
          {available.length === 0 ? (
            <li className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {t(
                "dispatcher.noMoreFireStations",
                "No more fire stations to associate",
              )}
            </li>
          ) : (
            available.map((s) => {
              const checked = selected.includes(s.id);
              return (
                <li
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 p-3 hover:bg-[hsl(var(--muted)/0.5)]",
                    checked && "bg-primary/5",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(s.id)}
                    className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {i18n.language === "ar" && s.name_ar ? s.name_ar : s.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {s.location_name} · {s.address}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span dir="ltr">{s.phone}</span>
                    </p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </ModalBody>
      <ModalFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t("common.cancel", "Cancel")}
        </Button>
        <Button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
        >
          {t("dispatcher.associate", "Associate")}
          {selected.length > 0 ? ` (${selected.length})` : ""}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
