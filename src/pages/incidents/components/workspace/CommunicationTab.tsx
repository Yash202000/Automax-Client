import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePickerWithRange } from "@/ui/date-range-picker";
import { AppPagination } from "../../../../components/ui/AppPagination";
import DOMPurify from "dompurify";
import { incidentApi } from "../../../../api/admin";
import type { Email } from "../../../../types";

function commDateTime(dateStr?: string): { date: string; time: string } {
  const fallback = { date: "—", time: "" };
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return fallback;
  return {
    date: d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function commStatusTone(messageStatus: string): {
  pill: string;
  icon: ReactNode;
} {
  if (messageStatus === "sent")
    return {
      pill: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
    };
  if (messageStatus === "failed")
    return {
      pill: "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300",
      icon: <XCircle className="h-3 w-3" />,
    };
  return {
    pill: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400",
    icon: <Loader2 className="h-3 w-3" />,
  };
}

/* Communication tab — same /notifications history as CommunicationHistory:
   channel + date-range filters, pagination, expandable rows. */
export function CommunicationTab({ incidentId }: { incidentId: string }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState<"" | "sms" | "email">("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const start = dateRange?.from ? new Date(dateRange.from) : undefined;
  start?.setHours(0, 0, 0, 0);
  const end = dateRange?.to ? new Date(dateRange.to) : undefined;
  end?.setHours(23, 59, 59, 999);
  const startDateStr = start?.toISOString();
  const endDateStr = end?.toISOString();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "incidents",
      "v2-list",
      "communications",
      incidentId,
      page,
      channel,
      startDateStr,
      endDateStr,
    ],
    queryFn: () =>
      incidentApi.getCommunications(incidentId, {
        page,
        limit: 20,
        channel: channel || undefined,
        start_date: startDateStr,
        end_date: endDateStr,
      }),
    enabled: !!incidentId,
    staleTime: 30_000,
  });

  const communications: Email[] = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const channelTabs: { value: "" | "sms" | "email"; label: string }[] = [
    { value: "", label: t("common.all") },
    { value: "email", label: t("incidents.email") },
    { value: "sms", label: t("incidents.sms") },
  ];

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center rounded-lg bg-[hsl(var(--muted)/0.8)] p-0.5 border border-[hsl(var(--border))]">
            {channelTabs.map((tabItem) => {
              const isActive = channel === tabItem.value;
              const Icon =
                tabItem.value === "email"
                  ? Mail
                  : tabItem.value === "sms"
                    ? MessageSquare
                    : null;
              return (
                <button
                  key={tabItem.value || "all"}
                  type="button"
                  onClick={() => {
                    setChannel(tabItem.value);
                    setPage(1);
                  }}
                  className={cn(
                    "text-xs rounded-md transition-all",
                    tabItem.value === ""
                      ? "px-3.5 py-1"
                      : "flex items-center gap-1.5 px-3 py-1",
                    isActive
                      ? "font-semibold bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shadow-sm"
                      : "font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  {Icon ? <Icon className="h-3 w-3" /> : null}
                  {tabItem.label}
                </button>
              );
            })}
          </div>
          <DatePickerWithRange
            value={dateRange}
            onChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
            disabled={(date: Date) => date > new Date()}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.6)] transition-colors text-xs disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
          {t("incidents.refresh")}
        </button>
      </div>
      {isLoading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-transparent" />
          {t("incidents.updating")}
        </div>
      ) : communications.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-8 w-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
            {t("incidents.noCommunications")}
          </p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
            {t("incidents.noCommunicationsDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {communications.map((comm) => {
            const { date, time } = commDateTime(
              comm.sent_at || comm.created_at,
            );
            const isExpanded = expanded.has(comm.id);
            const tone = commStatusTone(comm.status);
            const recipients =
              comm.recipients?.map((r) => r.email).join(", ") || "—";
            const senderName = comm.sent_by_user
              ? `${comm.sent_by_user.first_name || ""} ${comm.sent_by_user.last_name || ""}`.trim() ||
                comm.sent_by_user.email
              : t("common.system");
            const isEmail = comm.channel === "email";
            return (
              <div
                key={comm.id}
                className="rounded-xl bg-[hsl(var(--card)/0.9)] border border-[hsl(var(--border))] hover:border-[hsl(var(--border))] transition-colors group overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(comm.id)}
                  className="w-full flex items-center justify-between p-3.5 text-start"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted)/0.8)] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] shrink-0">
                      {isEmail ? (
                        <Mail className="h-4 w-4" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                    </div>
                    <div className="w-20 shrink-0 text-left">
                      <div className="text-xs font-medium text-[hsl(var(--foreground))] font-mono">
                        {date}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                        {time}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate",
                          isEmail
                            ? "text-xs font-semibold text-[hsl(var(--foreground))]"
                            : "text-xs font-medium text-[hsl(var(--foreground))]",
                        )}
                      >
                        {comm.subject || comm.body?.slice(0, 80) || "—"}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                        {senderName} → {recipients}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ps-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap",
                        tone.pill,
                      )}
                    >
                      {tone.icon}
                      {t(
                        `incidents.communicationStatus.${comm.status}`,
                        comm.status,
                      )}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--muted-foreground))] transition-colors" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--muted-foreground))] transition-colors rtl:rotate-180" />
                    )}
                  </div>
                </button>
                {isExpanded ? (
                  <div className="px-4 py-3 bg-[hsl(var(--muted)/0.4)] border-t border-[hsl(var(--border))] space-y-2">
                    {comm.subject ? (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        <span className="font-semibold text-[hsl(var(--foreground))]">
                          {t("incidents.emailSubject", "Subject")}:{" "}
                        </span>
                        {comm.subject}
                      </p>
                    ) : null}
                    {comm.body ? (
                      <div
                        className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed break-words"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(comm.body),
                        }}
                      />
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[hsl(var(--muted-foreground))] pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {date} {time}
                      </span>
                      <span className="capitalize">
                        {t("incidents.channel")}: {comm.channel}
                      </span>
                      {comm.template_code ? (
                        <span>
                          {t("incidents.triggeredBy", "Triggered by")}:{" "}
                          {comm.template_code}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center pt-1">
          <AppPagination
            page={page}
            totalPages={totalPages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      ) : null}
    </div>
  );
}
