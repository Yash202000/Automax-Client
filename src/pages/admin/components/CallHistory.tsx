
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Phone, RefreshCw, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { callLogApi } from '../../../api/admin';

export const CallHistory: React.FC = () => {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data, isLoading, refetch, isFetching, error } = useQuery({
        queryKey: ['call-logs', page, limit],
        queryFn: () => callLogApi.list(page, limit),
        retry: 1,
    });

    const calls = data?.data || [];
    const isPermissionError = error && (error as any)?.response?.status === 403;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'missed':
            case 'rejected':
            case 'failed':
                return 'text-red-500';
            case 'busy':
                return 'text-orange-500';
            case 'answered':
                return 'text-green-500';
            default:
                return 'text-slate-900';
        }
    };

    const calculateDuration = (startAt: string, endAt?: string) => {
        if (!endAt) return 0;
        const start = new Date(startAt).getTime();
        const end = new Date(endAt).getTime();
        return Math.floor((end - start) / 1000); // duration in seconds
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds || seconds === 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTimestamp = (dateString: string) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (days === 1) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('callCentre.callHistory', 'Call History')}</h1>
                    <p className="text-slate-500 mt-1">{t('callCentre.historySubtitle', 'View your recent calls')}</p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">{t('callCentre.recentCalls', 'Recent Calls')}</h2>
                </div>
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-500">Loading call history...</p>
                    </div>
                ) : isPermissionError ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h3>
                        <p className="text-slate-500">You don't have permission to view call logs.</p>
                        <p className="text-sm text-slate-400 mt-2">Contact your administrator for access.</p>
                    </div>
                ) : calls.length === 0 ? (
                    <div className="p-12 text-center">
                        <Phone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No call history yet</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-slate-100">
                            {calls.map((call: any) => {
                                const duration = calculateDuration(call.start_at, call.end_at);
                                const creatorName = call.creator
                                    ? `${call.creator.first_name} ${call.creator.last_name}`.trim() || call.creator.username
                                    : 'Unknown';
                                const extension = call.creator?.extension || '—';

                                return (
                                    <div key={call.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                call.status === 'missed' || call.status === 'rejected' || call.status === 'failed' ? 'bg-red-50' :
                                                call.status === 'completed' || call.status === 'answered' ? 'bg-green-50' : 'bg-slate-100'
                                            }`}>
                                                <Phone className={`w-4 h-4 ${
                                                    call.status === 'missed' || call.status === 'rejected' || call.status === 'failed' ? 'text-red-500' :
                                                    call.status === 'completed' || call.status === 'answered' ? 'text-green-500' : 'text-slate-400'
                                                }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-medium ${getStatusColor(call.status)}`}>
                                                        {creatorName}
                                                    </h3>
                                                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                                        Ext. {extension}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                                    <span className="capitalize">{call.status}</span>
                                                    <span>•</span>
                                                    <span className="text-xs text-slate-400 truncate">{call.call_uuid}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-sm font-medium text-slate-900">{formatTimestamp(call.start_at)}</p>
                                            <p className="text-sm text-slate-500">
                                                {duration > 0 ? formatDuration(duration) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {data?.total_pages > 1 && (
                            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                                <p className="text-sm text-slate-500">
                                    Page {page} of {data.total_pages}
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
                                        onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
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
