import React, { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { emailApi, incidentApi } from "../../api/admin";
import { useTranslation } from "react-i18next";

export const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ["in-app-notifications", user?.id],
    queryFn: () =>
      emailApi.list({
        channel: "notification",
        category: "inbox",
        received_by: user?.id,
        limit: 15,
        page: 1,
      }),
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  const notifications = notifData?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => emailApi.markAsRead(id, true),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["in-app-notifications", user?.id],
      }),
  });

  const navigateToNotif = async (subject: string) => {
    const match = subject.match(/Incident\s+([A-Z0-9-]+)/i);
    if (!match) return;
    const num = match[1];
    if (/req/i.test(num)) {
      navigate(`/requests?search=${num}`);
      return;
    }
    if (/com/i.test(num)) {
      navigate(`/complaints?search=${num}`);
      return;
    }
    if (/qry/i.test(num)) {
      navigate(`/queries?search=${num}`);
      return;
    }
    try {
      const res = await incidentApi.list({ search: num, limit: 1, page: 1 });
      if (res.data?.length) navigate(`/incidents/${res.data[0].id}`);
      else navigate(`/incidents?search=${num}`);
    } catch {
      navigate(`/incidents?search=${num}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors focus:outline-none focus:ring-0"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-sidebar">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              {t("settings.notifications")}
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs text-slate-500">
                {unreadCount} {t("common.unread")}
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  {t("common.noNotifications")}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={async () => {
                    if (!notif.is_read) markReadMutation.mutate(notif.id);
                    setIsOpen(false);
                    await navigateToNotif(notif.subject);
                  }}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${
                    !notif.is_read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        !notif.is_read ? "bg-blue-500" : "bg-transparent"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          !notif.is_read
                            ? "font-semibold text-slate-900"
                            : "font-medium text-slate-700"
                        }`}
                      >
                        {notif.subject}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {notif.body}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <CheckCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
