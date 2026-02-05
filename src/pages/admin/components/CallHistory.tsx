
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, RefreshCw, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
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

    const getStatusIcon = (callType: string, status: string) => {
        if (status === 'missed' || status === 'rejected') {
            return <PhoneMissed className="w-4 h-4 text-red-500" />;
        }
        if (callType === 'outbound') {
            return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
        }
        if (callType === 'inbound') {
            return <PhoneIncoming className="w-4 h-4 text-green-500" />;
        }
        return <Phone className="w-4 h-4 text-slate-400" />;
    };

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

    const formatDuration = (seconds?: number) => {
        if (!seconds || seconds === 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTimestamp = (dateString: string) => {
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
                            {calls.map((call: any) => (
                                <div key={call.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            call.status === 'missed' || call.status === 'rejected' ? 'bg-red-50' :
                                            call.status === 'answered' ? 'bg-green-50' : 'bg-slate-100'
                                        }`}>
                                            {getStatusIcon(call.call_type, call.status)}
                                        </div>
                                        <div>
                                            <h3 className={`font-medium ${getStatusColor(call.status)}`}>
                                                {call.call_type === 'outbound' ? call.callee_number : call.caller_number}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span>{call.call_type === 'outbound' ? 'Outgoing' : call.call_type === 'inbound' ? 'Incoming' : 'Internal'}</span>
                                                <span>•</span>
                                                <span className="capitalize">{call.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-slate-900">{formatTimestamp(call.start_time)}</p>
                                        <p className="text-sm text-slate-500">
                                            {call.duration ? formatDuration(call.duration) : '—'}
                                        </p>
                                    </div>
                                </div>
                            ))}
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
