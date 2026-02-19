import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    Mail,
    Building2,
    MapPin,
    Phone,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    User as UserIcon,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { userApi } from '../../../api/admin';
import type { User } from '../../../types';
import { cn } from '@/lib/utils';

interface ContactsListProps {
    variant?: 'default' | 'call-centre';
}

export const ContactsList: React.FC<ContactsListProps> = ({ variant = 'default' }) => {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const limit = 10;

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['admin', 'users', page, limit],
        queryFn: () => userApi.list(page, limit),
    });

    const filteredUsers = data?.data?.filter(
        (user: User) =>
            user.username.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = data?.total_pages ?? 1;

    const getUserStatus = (userId: string) => {
        const lastChar = userId.charCodeAt(userId.length - 1);
        if (lastChar % 3 === 0) return 'online';
        if (lastChar % 3 === 1) return 'offline';
        return 'in-call';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500 border-white';
            case 'in-call': return 'bg-red-500 border-white';
            case 'offline': default: return 'bg-slate-300 border-white';
        }
    };

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm">
                <div className="flex flex-col items-center justify-center">
                    <div className="text-rose-500 mb-4">
                        <UserIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('users.failedToLoad', 'Failed to load contacts')}</h3>
                    <Button onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
                        {t('common.tryAgain', 'Try Again')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-card rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute start-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder={t('users.searchPlaceholder', 'Search contacts...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full ps-12 pe-4 py-3 bg-slate-50 dark:bg-background border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            isLoading={isFetching}
                            leftIcon={!isFetching ? <RefreshCw className="w-4 h-4" /> : undefined}
                        >
                            {t('common.refresh', 'Refresh')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-slate-500">{t('users.loadingUsers', 'Loading contacts...')}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <th className="px-6 py-4 text-start">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                {t('users.user', 'User')}
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 text-start">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                {t('users.phone', 'Phone')}
                                            </span>
                                        </th>
                                        {variant === 'call-centre' && (
                                            <th className="px-6 py-4 text-start">
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Extension
                                                </span>
                                            </th>
                                        )}
                                        <th className="px-6 py-4 text-start">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                {t('users.email', 'Email')}
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 text-start">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                {t('users.department', 'Department')}
                                            </span>
                                        </th>
                                        {variant !== 'call-centre' && (
                                            <th className="px-6 py-4 text-start">
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    {t('users.location', 'Location')}
                                                </span>
                                            </th>
                                        )}
                                        {variant === 'call-centre' && (
                                            <th className="px-6 py-4 text-center">
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    {t('users.actions', 'Actions')}
                                                </span>
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredUsers?.map((user: User) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        {user.avatar ? (
                                                            <img
                                                                src={user.avatar}
                                                                alt={user.username}
                                                                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-white shadow-sm">
                                                                <span className="text-white text-sm font-bold">
                                                                    {user.first_name?.[0] || user.username[0]}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {variant === 'call-centre' && (
                                                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 ${getStatusColor(getUserStatus(user.id))}`} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {user.first_name} {user.last_name}
                                                        </p>
                                                        <p className="text-sm text-slate-500">@{user.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-700 font-medium">
                                                            {user.phone}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400 italic">No phone</span>
                                                )}
                                            </td>
                                            {variant === 'call-centre' && (
                                                <td className="px-6 py-4">
                                                    {(user as any).extension ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-lg border border-violet-200">
                                                            <Phone className="w-3 h-3" />
                                                            Ext. {(user as any).extension}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">—</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm text-slate-700 truncate max-w-[200px]">
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(user.departments && user.departments.length > 0) ? (
                                                        <>
                                                            {user.departments.slice(0, 2).map((dept) => (
                                                                <span
                                                                    key={dept.id}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg border border-blue-100"
                                                                >
                                                                    <Building2 className="w-3 h-3" />
                                                                    {dept.name}
                                                                </span>
                                                            ))}
                                                            {user.departments.length > 2 && (
                                                                <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">
                                                                    +{user.departments.length - 2}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : user.department ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                                                            <Building2 className="w-3 h-3" />
                                                            {user.department.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            {variant !== 'call-centre' && (
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(user.locations && user.locations.length > 0) ? (
                                                            <>
                                                                {user.locations.slice(0, 2).map((loc) => (
                                                                    <span
                                                                        key={loc.id}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100"
                                                                    >
                                                                        <MapPin className="w-3 h-3" />
                                                                        {loc.name}
                                                                    </span>
                                                                ))}
                                                                {user.locations.length > 2 && (
                                                                    <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">
                                                                        +{user.locations.length - 2}
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : user.location ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                                                <MapPin className="w-3 h-3" />
                                                                {user.location.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-slate-400">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            {variant === 'call-centre' && (
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            const extension = (user as any).extension || user.phone;
                                                            if (extension) {
                                                                window.dispatchEvent(new CustomEvent('initiate-call', {
                                                                    detail: { number: extension }
                                                                }));
                                                            }
                                                        }}
                                                        disabled={!(user as any).extension && !user.phone}
                                                        className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                                        title={(user as any).extension ? `Call ext. ${(user as any).extension}` : user.phone ? `Call ${user.phone}` : 'No extension'}
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                        {(user as any).extension && (
                                                            <span className="text-xs font-medium">Ext. {(user as any).extension}</span>
                                                        )}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {filteredUsers?.length === 0 && (
                                        <tr>
                                            <td colSpan={variant === 'call-centre' ? 6 : 5} className="py-12 text-center text-slate-500">
                                                {t('users.noUsersFound', 'No contacts found')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50">
                            <p className="text-sm text-slate-500">
                                {t('common.showing', 'Showing')}{' '}
                                <span className="font-semibold text-slate-900">
                                    {((page - 1) * limit) + 1}
                                </span>{' '}
                                {t('users.to', 'to')}{' '}
                                <span className="font-semibold text-slate-900">
                                    {Math.min(page * limit, data?.total_items || 0)}
                                </span>{' '}
                                {t('common.of', 'of')}{' '}
                                <span className="font-semibold text-slate-900">{data?.total_items || 0}</span> {t('users.users', 'contacts')}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                                                    page === pageNum
                                                        ? "bg-linear-to-r from-primary to-accent text-white shadow-lg shadow-primary/30"
                                                        : "text-slate-600 hover:bg-white hover:shadow-sm"
                                                )}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
