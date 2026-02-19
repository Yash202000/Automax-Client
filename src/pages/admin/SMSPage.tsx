import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    MessageSquare,
    Send,
    Inbox,
    Trash,
    Plus,
    Search,
    X,
    Phone,
    Loader2
} from 'lucide-react';
import { smsApi } from '../../api/admin';
import type { SMS, SMSFilter } from '../../types';
import { Button } from '@/components/ui';

export const SMSPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
    const [selectedSMS, setSelectedSMS] = useState<SMS | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isComposeOpen, setIsComposeOpen] = useState(false);

    // Compose State
    const [composeTo, setComposeTo] = useState('');
    const [composeBody, setComposeBody] = useState('');

    // Fetch SMS
    const { data: smsData, isLoading } = useQuery({
        queryKey: ['sms', currentFolder, searchTerm],
        queryFn: () => {
            const filter: SMSFilter = {
                page: 1,
                limit: 50,
                search: searchTerm,
                channel: 'sms',
            };

            if (currentFolder === 'inbox') {
                filter.direction = 'inbound';
            } else if (currentFolder === 'sent') {
                filter.direction = 'outbound';
            } else {
                filter.category = currentFolder;
            }

            return smsApi.list(filter);
        },
    });

    const smsList = smsData?.data || [];

    // Send SMS Mutation
    const sendSMSMutation = useMutation({
        mutationFn: (data: { to: string; body: string }) => smsApi.send(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sms'] });
            setIsComposeOpen(false);
            setComposeTo('');
            setComposeBody('');
        },
    });

    const handleSendSMS = (e: React.FormEvent) => {
        e.preventDefault();
        sendSMSMutation.mutate({
            to: composeTo,
            body: composeBody,
        });
    };

    // Delete SMS Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => smsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sms'] });
            setSelectedSMS(null);
        },
    });

    const deleteSMS = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this SMS?')) {
            deleteMutation.mutate(id);
        }
    };

    const getPhoneNumber = (sms: SMS) => {
        const recipient = sms.recipients.find(r => r.type === 'to');
        return recipient?.email || 'Unknown';
    };

    return (
        <div className="h-[calc(100vh-100px)] flex bg-card rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Sidebar */}
            <div className="w-64 bg-card border-r border-slate-200 flex flex-col hidden md:flex">
                <div className="p-4">
                    <Button
                        onClick={() => setIsComposeOpen(true)}
                        className="w-full"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New SMS</span>
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-3 space-y-1">
                        <button
                            onClick={() => { setCurrentFolder('inbox'); setSelectedSMS(null); }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFolder === 'inbox' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Inbox className="w-4 h-4" />
                                <span>Inbox</span>
                            </div>
                        </button>
                        <button
                            onClick={() => { setCurrentFolder('sent'); setSelectedSMS(null); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFolder === 'sent' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <Send className="w-4 h-4" />
                            <span>Sent</span>
                        </button>
                        <button
                            onClick={() => { setCurrentFolder('trash'); setSelectedSMS(null); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFolder === 'trash' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <Trash className="w-4 h-4" />
                            <span>Trash</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* SMS List */}
            <div className={`${selectedSMS ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 border-r border-slate-200 bg-card`}>
                <div className="p-4 border-b border-slate-200">
                    <div className="md:hidden mb-4 flex gap-2">
                        <button onClick={() => setIsComposeOpen(true)} className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium">New SMS</button>
                        <select
                            value={currentFolder}
                            onChange={(e) => { setCurrentFolder(e.target.value as any); setSelectedSMS(null); }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 text-sm"
                        >
                            <option value="inbox">Inbox</option>
                            <option value="sent">Sent</option>
                            <option value="trash">Trash</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : smsList.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <p>No messages found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {smsList.map(sms => (
                                <div
                                    key={sms.id}
                                    onClick={() => setSelectedSMS(sms)}
                                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedSMS?.id === sms.id ? 'bg-primary/10 hover:bg-primary/10' : ''} ${!sms.is_read ? 'bg-slate-50' : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            <h3 className={`text-sm truncate pr-2 ${!sms.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                {getPhoneNumber(sms)}
                                            </h3>
                                        </div>
                                        <span className={`text-xs whitespace-nowrap ${!sms.is_read ? 'text-primary font-medium' : 'text-slate-400'}`}>
                                            {new Date(sms.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        {sms.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SMS Detail */}
            <div className={`${!selectedSMS ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-card overflow-hidden`}>
                {selectedSMS ? (
                    <>
                        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-white">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-4 mb-4">
                                    <button onClick={() => setSelectedSMS(null)} className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-primary font-bold">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">{getPhoneNumber(selectedSMS)}</div>
                                            <div className="text-xs text-slate-400">{new Date(selectedSMS.created_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 uppercase">
                                        {selectedSMS.category || currentFolder}
                                    </span>
                                    <button onClick={(e) => deleteSMS(e, selectedSMS.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Delete">
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="text-slate-800">
                                {selectedSMS.body}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <p className="text-lg font-medium text-slate-600">Select a message to read</p>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {isComposeOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-slate-900">New SMS</h3>
                            <button
                                onClick={() => setIsComposeOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSendSMS} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">To (Phone Number)</label>
                                    <input
                                        type="tel"
                                        required
                                        value={composeTo}
                                        onChange={e => setComposeTo(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="+1234567890"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                    <textarea
                                        required
                                        value={composeBody}
                                        onChange={e => setComposeBody(e.target.value)}
                                        className="w-full h-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        placeholder="Write your message here..."
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                                <button
                                    type="button"
                                    onClick={() => setIsComposeOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendSMSMutation.isPending}
                                    className="px-6 py-2 bg-primary hover:bg-primary text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {sendSMSMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
