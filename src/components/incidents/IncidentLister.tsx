import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Search,
  Phone,
  Calendar,
  ArrowRight,
  Loader2,
  History,
  Minus,
} from "lucide-react";
import { useSoftphoneStore } from "../../stores/softphoneStore";
import { useInfiniteQuery } from "@tanstack/react-query";
import { incidentApi } from "@/api/admin";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function IncidentLister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    openCallerIncidents,
    setOpenCallerIncidents,
    incomingCallNumber,
    isCallerIncidentsMinimized,
    setIsCallerIncidentsMinimized,
  } = useSoftphoneStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["incidents", "caller-lookup", debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      incidentApi.list({
        page: pageParam,
        limit: 15,
        search: debouncedSearch,
        reporter_phone: incomingCallNumber || undefined,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: openCallerIncidents,
  });

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!observerTarget.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const incidents = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const totalItems = useMemo(() => {
    return data?.pages[0]?.total_items || 0;
  }, [data]);

  if (!openCallerIncidents) {
    return null;
  }

  if (isCallerIncidentsMinimized) {
    return (
      <div className="fixed top-1/2 right-0 -translate-y-1/2 z-[1000]">
        <button
          onClick={() => setIsCallerIncidentsMinimized(false)}
          className="bg-white p-3 rounded-l-xl shadow-lg border-y border-l border-gray-200 hover:bg-gray-50 flex flex-col items-center gap-2 group transition-all"
          title={t(
            "softphone.maximizeCallerIncidents",
            "Maximize Caller Incidents",
          )}
        >
          <History className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-gray-600 [writing-mode:vertical-lr] rotate-180">
            {t("softphone.callerIncidents", "Caller Incidents")}
          </span>
        </button>
      </div>
    );
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-700 border-red-200";
      case 2:
        return "bg-orange-100 text-orange-700 border-orange-200";
      case 3:
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return t("priority.critical", "Critical");
      case 2:
        return t("priority.high", "High");
      case 3:
        return t("priority.medium", "Medium");
      default:
        return t("priority.low", "Low");
    }
  };

  return (
    <div className="fixed inset-y-2 right-2 z-[1000] flex pointer-events-none">
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden pointer-events-auto"
        onClick={() => setOpenCallerIncidents(false)}
      />

      <div
        className={cn(
          "relative w-full max-w-[420px] bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col pointer-events-auto",
          "border-l border-gray-200/50 animate-in slide-in-from-right duration-300",
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-white/50 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                {t("softphone.callerIncidents", "Caller Incidents")}
                {totalItems > 0 && (
                  <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full font-semibold">
                    {totalItems}
                  </span>
                )}
              </h2>
              {incomingCallNumber && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3" />
                  {incomingCallNumber}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCallerIncidentsMinimized(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title={t("common.minimize", "Minimize")}
              >
                <Minus size={20} />
              </button>
              <button
                onClick={() => setOpenCallerIncidents(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t(
                "common.searchPlaceholder",
                "Search by ID, name, or phone...",
              )}
              className={cn(
                "w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm transition-all",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white",
              )}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-gray-500 animate-pulse">
                {t("common.loading", "Loading incidents...")}
              </p>
            </div>
          ) : isError ? (
            <div className="p-6 text-center">
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                {t(
                  "common.errorLoading",
                  "Could not load incidents. Please try again.",
                )}
                <button
                  onClick={() => refetch()}
                  className="block mx-auto mt-2 font-semibold hover:underline"
                >
                  {t("common.retry", "Retry")}
                </button>
              </div>
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-gray-900 font-semibold mb-1">
                {t("common.noResults", "No incidents found")}
              </h3>
              <p className="text-sm text-gray-500">
                {searchTerm
                  ? t(
                      "common.noSearchMatches",
                      'We couldn\'t find anything matching "{{term}}"',
                      { term: searchTerm },
                    )
                  : t(
                      "common.noActiveIncidents",
                      "There are no active incidents for this caller.",
                    )}
              </p>
            </div>
          ) : (
            <>
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => {
                    navigate(`/incidents/${incident.id}`);
                    // setOpenCallerIncidents(false);
                  }}
                  className={cn(
                    "group relative p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer transition-all duration-200",
                    "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
                    "active:scale-[0.98]",
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                        getPriorityColor(incident?.priority || 0),
                      )}
                    >
                      {getPriorityLabel(incident?.priority || 0)}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(incident.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {incident.title}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
                    {incident.description ||
                      t("common.noDescription", "No description provided")}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-gray-600">
                        {incident.current_state?.name || "New"}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}

              {/* Lazy Loading Trigger */}
              <div
                ref={observerTarget}
                className="h-10 flex items-center justify-center"
              >
                {isFetchingNextPage && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-gray-50 bg-gray-50/50 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Automax
          </p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
