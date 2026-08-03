import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  PhoneIncoming,
  Headphones,
} from "lucide-react";
import { callLogApi } from "../../../api/admin";
import { AudioPlayer } from "../../../components/common/AudioPlayer";
import { cn } from "@/lib/utils";
import CallablePhone from "../../../components/common/CallablePhone";

export const CallHistory: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["call-logs", page, limit],
    queryFn: () => callLogApi.list(page, limit),
    retry: 1,
    // New calls (CTI webhooks) land without any user action on this page —
    // poll so they show up without a manual refresh, same as the notification
    // bell / incident layout's backoff-polling convention.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const calls = data?.data || [];
  const isPermissionError = error && (error as any)?.response?.status === 403;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "missed":
      case "rejected":
      case "failed":
      case "declined":
      case "cancelled":
        return "text-red-500";
      case "busy":
        return "text-orange-500";
      case "answered":
      case "completed":
        return "text-green-500";
      case "offline":
        return "text-slate-400";
      default:
        return "text-slate-900";
    }
  };

  const getCallIcon = (call: any) => {
    const isOutgoing = call.direction === "outgoing";

    switch (call.status) {
      case "missed":
        return PhoneMissed;
      case "declined":
      case "rejected":
      case "failed":
      case "cancelled":
        return PhoneOff;
      case "answered":
      case "completed":
        return isOutgoing ? PhoneOutgoing : PhoneIncoming;
      default:
        return isOutgoing ? PhoneOutgoing : PhoneIncoming;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const now = new Date();

    const dateMidnight = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const nowMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const diffDays = Math.round(
      (nowMidnight.getTime() - dateMidnight.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("callCentre.callHistory")}</h1>
          <p className="text-slate-500 mt-1">
            {t("callCentre.historySubtitle")}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
          />
          <span className="text-sm font-medium">{t("common.refresh")}</span>
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold ">
            {t("callCentre.recentCalls")}
          </h2>
        </div>
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">{t("users.loadingCallHistory")}</p>
          </div>
        ) : isPermissionError ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold  mb-2">
              {t("users.accessDenied")}
            </h3>
            <p className="text-slate-500">
              {t("users.youDonTHavePermissionToView")}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {t("users.contactYourAdministratorForAccess")}
            </p>
          </div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center">
            <Phone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t("users.noCallHistoryYet")}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {calls.map((call: any) => (
                <CallHistoryItem
                  key={call.id}
                  call={call}
                  getStatusColor={getStatusColor}
                  getCallIcon={getCallIcon}
                  formatTimestamp={formatTimestamp}
                  formatDuration={formatDuration}
                  t={t}
                />
              ))}
            </div>

            {/* Pagination */}
            {data?.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {t("common.page")}
                  {page}
                  {t("common.of")}
                  {data.total_pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.total_pages, p + 1))
                    }
                    disabled={page === data.total_pages}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const CallHistoryItem: React.FC<{
  call: any;
  getStatusColor: (status: string) => string;
  getCallIcon: (call: any) => any;
  formatTimestamp: (dateString: string) => string;
  formatDuration: (seconds?: number) => string;
  t: any;
}> = ({
  call,
  getStatusColor,
  getCallIcon,
  formatTimestamp,
  formatDuration,
  t,
}) => {
  const [showRecording, setShowRecording] = useState(false);
  const isFailed =
    call.status === "missed" ||
    call.status === "rejected" ||
    call.status === "failed";
  const isAnswered = call.status === "completed" || call.status === "answered";
  const Icon = getCallIcon(call);

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isFailed ? "bg-red-50" : isAnswered ? "bg-green-50" : "bg-slate-100"}`}
          >
            {/* <Icon
                className={`w-4 h-4 ${isFailed ? "text-red-500" : isAnswered ? "text-green-500" : "text-slate-400"}`}
              /> */}
            {React.createElement(Icon, {
              className: `w-4 h-4 ${
                isFailed
                  ? "text-red-500"
                  : isAnswered
                    ? "text-green-500"
                    : "text-slate-400"
              }`,
            })}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-medium ${getStatusColor(call.status)}`}>
                {call.other_party_name || "Unknown"}
              </h3>
              {call.other_party_extension && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                  Ext.{" "}
                  <CallablePhone
                    number={call.other_party_extension}
                    showIcon={false}
                    className="text-xs"
                  />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
              <span className="capitalize">{call.status}</span>
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="text-sm font-medium text-slate-900">
            {formatTimestamp(call.created_at)}
          </p>
          <p className="text-sm text-slate-500">
            {call.duration > 0 ? formatDuration(call.duration) : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {call.recording_url && (
            <button
              onClick={() => setShowRecording(!showRecording)}
              className={cn(
                "p-2 rounded-xl transition-colors inline-flex items-center gap-2",
                showRecording
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:bg-primary/10 hover:text-primary",
              )}
              title={
                showRecording
                  ? t("callCentre.hideRecording")
                  : t("callCentre.showRecording")
              }
            >
              <Headphones className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              const number = call.other_party_extension || call.other_party_phone;
              if (number) {
                window.dispatchEvent(
                  new CustomEvent("initiate-call", {
                    detail: { number },
                  }),
                );
              }
            }}
            disabled={!call.other_party_extension && !call.other_party_phone}
            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            title={
              call.other_party_extension
                ? `Call ext. ${call.other_party_extension}`
                : call.other_party_phone
                  ? `Call ${call.other_party_phone}`
                  : "No extension"
            }
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showRecording && call.recording_url && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <AudioPlayer
            src={call.recording_url}
            fileName={`recording-${call.id}.mp3`}
          />
        </div>
      )}
    </div>
  );
};
