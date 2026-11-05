import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Flame, MapPin, Phone, Search } from "lucide-react";
import { Button } from "../ui";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../ui/Modal";
import { cn } from "@/lib/utils";
import { dispatcherApi, type FireStation } from "../../api/dispatcher";
import FireStationMap from "./FireStationMap";

/**
 * Shown when creating an incident from the dispatcher: pick fire stations on
 * the map / list, then either alert them first or skip alerting.
 * Mount it only while open so its state (search, selection) starts fresh.
 * `onProceed` runs once the chosen path is done (after the alert API call for
 * "Alert fire station", immediately for "Without alerting").
 */
export function FireStationAlertModal({
  isOpen,
  onClose,
  onProceed,
}: {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(
    null,
  );

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ["dispatcher", "fire-stations"],
    queryFn: () => dispatcherApi.getFireStations(),
    enabled: isOpen,
  });

  const stationName = useCallback(
    (s: FireStation) =>
      i18n.language === "ar" && s.name_ar ? s.name_ar : s.name,
    [i18n.language],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((s) =>
      [s.name, s.name_ar, s.location_name, s.address].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [stations, search]);

  const alertMutation = useMutation({
    mutationFn: () => dispatcherApi.alertFireStations(selectedIds),
    onSuccess: () => {
      toast.success(
        t("dispatcher.alertSent", "Fire stations alerted successfully"),
      );
      onProceed();
    },
    onError: () =>
      toast.error(t("dispatcher.alertFailed", "Failed to alert fire stations")),
  });

  const toggle = useCallback(
    (id: string) =>
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      ),
    [],
  );

  const focusStation = (s: FireStation) =>
    setFocus((prev) => ({ id: s.id, nonce: (prev?.nonce ?? 0) + 1 }));

  const busy = alertMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => undefined : onClose}
      size="full"
      className="max-h-[92vh] max-w-6xl flex flex-col overflow-hidden"
    >
      <ModalHeader className="flex items-center gap-3 py-3.5 px-6 border-b border-[hsl(var(--border))]">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
          <Flame className="w-5 h-5" />
        </div>
        <ModalTitle>
          {t("dispatcher.selectFireStations", "Select Fire Stations")}
        </ModalTitle>
      </ModalHeader>

      <ModalBody className="p-0 flex min-h-0 flex-col md:flex-row">
        {/* Map */}
        <div className="relative h-64 md:h-auto md:flex-1 min-h-[16rem]">
          <div className="absolute inset-0 z-0">
            <FireStationMap
              stations={filtered}
              selectedIds={selectedIds}
              onToggle={toggle}
              focus={focus}
              getName={stationName}
            />
          </div>
        </div>

        {/* Listing */}
        <aside className="flex w-full md:w-96 shrink-0 flex-col border-t md:border-t-0 md:border-s border-[hsl(var(--border))] min-h-0">
          <div className="p-3 border-b border-[hsl(var(--border))]">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  "dispatcher.searchFireStations",
                  "Search fire stations",
                )}
                className="w-full ps-9 pe-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
              {t("dispatcher.selectedCount", "{{count}} selected", {
                count: selectedIds.length,
              })}
            </p>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]">
            {isLoading ? (
              <li className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {t("common.loading", "Loading...")}
              </li>
            ) : filtered.length === 0 ? (
              <li className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {t("dispatcher.noFireStations", "No fire stations found")}
              </li>
            ) : (
              filtered.map((s) => {
                const checked = selectedIds.includes(s.id);
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-[hsl(var(--muted)/0.5)]",
                      checked && "bg-primary/5",
                    )}
                    onClick={() => focusStation(s)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggle(s.id)}
                      aria-label={stationName(s)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                    />
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-[hsl(var(--foreground))]">
                        {stationName(s)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {s.location_name} · {s.address}
                        </span>
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
        </aside>
      </ModalBody>

      <ModalFooter className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={onProceed} disabled={busy}>
          {t("dispatcher.withoutAlerting", "Without alerting")}
        </Button>
        <Button
          onClick={() => alertMutation.mutate()}
          disabled={busy || selectedIds.length === 0}
          isLoading={busy}
        >
          {t("dispatcher.alertFireStation", "Alert fire station")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
