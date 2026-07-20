import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Mail,
  MessageSquare,
  Clock,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui";
import { DatePickerWithRange } from "@/ui/date-range-picker";
import { incidentApi } from "../../api/admin";
import type { Email } from "../../types";
import { AppPagination } from "../ui/AppPagination";

interface CommunicationHistoryProps {
  incidentId: string;
}

const statusStyles: Record<
  string,
  { icon: React.ReactNode; className: string }
> = {
  sent: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  failed: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  pending: {
    icon: <Loader2 className="w-3.5 h-3.5" />,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  partial: {
    icon: <Loader2 className="w-3.5 h-3.5" />,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

export const CommunicationHistory: React.FC<CommunicationHistoryProps> = ({
  incidentId,
}) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState<"" | "sms" | "email">("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{
    from?: Date | undefined;
    to?: Date | undefined;
  }>({});

  const startDate = dateRange.from ? new Date(dateRange.from) : undefined;
  startDate?.setHours(0, 0, 0, 0);

  const endDate = dateRange.to ? new Date(dateRange.to) : undefined;
  endDate?.setHours(23, 59, 59, 999);

  const startDateStr = startDate?.toISOString();
  const endDateStr = endDate?.toISOString();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: [
      "incident",
      incidentId,
      "communications",
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
  });

  const communications: Email[] = data?.data || [];
  const totalPages = data?.total_pages || 1;
  const totalItems = data?.total_items || 0;

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString("en-US", {
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[hsl(var(--muted-foreground))]">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  const channelTabs: {
    value: "" | "sms" | "email";
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "", label: t("common.all", "All"), icon: null },
    {
      value: "email",
      label: t("incidents.email", "Email"),
      icon: <Mail className="w-3.5 h-3.5" />,
    },
    {
      value: "sms",
      label: t("incidents.sms", "SMS"),
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[hsl(var(--muted)/0.5)] rounded-lg">
            {channelTabs.map((tab) => (
              <button
                key={tab.value || "all"}
                onClick={() => {
                  setChannel(tab.value);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  channel === tab.value
                    ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <DatePickerWithRange
            value={dateRange as any}
            onChange={(r) => {
              setDateRange(r || {});
              setPage(1);
            }}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          leftIcon={
            <RefreshCw
              className={cn("w-4 h-4", isFetching && "animate-spin")}
            />
          }
        >
          {t("common.refresh")}
        </Button>
      </div>
      {communications.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[hsl(var(--border))] rounded-lg">
          <FileText className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
          <p className="text-[hsl(var(--foreground))] font-medium">
            {t("incidents.noCommunications", "No communications found")}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t(
              "incidents.noCommunicationsDesc",
              "SMS and email communications for this incident will appear here.",
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-screen overflow-y-auto ">
          {communications.map((comm) => {
            const { date, time } = formatDateTime(
              comm.sent_at || comm.created_at,
            );
            const isExpanded = expanded.has(comm.id);
            const status = statusStyles[comm.status] || statusStyles.sent;
            const recipients = comm.recipients?.map((r) => r.email).join(", ");
            const senderLabel = comm.sent_by_user
              ? `${comm.sent_by_user.first_name || ""} ${comm.sent_by_user.last_name || ""}`.trim() ||
                comm.sent_by_user.email
              : t("common.system", "System");

            return (
              <div
                key={comm.id}
                className="border border-[hsl(var(--border))] rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(comm.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--muted)/0.3)] transition-colors"
                >
                  <div className="bg-primary/5 p-2 rounded-md">
                    {comm.channel === "email" ? (
                      <Mail className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-24">
                    <span className="text-sm whitespace-nowrap">{date}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {time}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                      {comm.subject || comm.body?.slice(0, 80) || "-"}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                      {senderLabel} → {recipients || "-"}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap",
                      status.className,
                    )}
                  >
                    {status.icon}
                    {t(`incidents.status.${comm.status}`, comm.status)}
                  </span>

                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 py-3 bg-[hsl(var(--muted)/0.2)] border-t border-[hsl(var(--border))] space-y-2">
                    {comm.subject && (
                      <p className="text-sm">
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          {t("common.subject", "Subject")}:
                        </span>{" "}
                        {comm.subject}
                      </p>
                    )}
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: comm.body || "",
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))] pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {date} {time}
                      </span>
                      <span>
                        {t("incidents.channel", "Channel")}:{" "}
                        {comm.channel.toUpperCase()}
                      </span>
                      {comm.template_code && (
                        <span>
                          {t("incidents.triggeredBy", "Triggered by")}:{" "}
                          {comm.template_code}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalItems)} of{" "}
            <span className="font-medium text-foreground">{totalItems}</span>{" "}
            communications
          </p>

          <AppPagination
            page={page}
            totalPages={totalPages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}
    </div>
  );
};

export default CommunicationHistory;
