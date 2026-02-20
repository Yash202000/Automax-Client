import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailApi } from '../../api/admin';
import type { Email, EmailFilter } from '../../types';
import {
    Mail,
    Send,
    Inbox,
    Trash,
    Plus,
    Search,
    Star,
    Reply,
    Forward,
    Paperclip,
    X,
    Loader2,
    AlertCircle,
    Download,
    FileText,
    Save,
} from 'lucide-react';
import { RichTextEditor } from '../../components/RichTextEditor';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';

type Folder = 'inbox' | 'sent' | 'drafts' | 'trash';

export const EmailPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [currentFolder, setCurrentFolder] = useState<Folder>('inbox');
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page] = useState(1);
    const { user } = useAuthStore();

    // Compose State
    const [composeTo, setComposeTo] = useState('');
    const [composeCc, setComposeCc] = useState('');
    const [composeBcc, setComposeBcc] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    // Track if we're editing an existing draft
    const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

    // Fetch Emails
    const { data: emailData, isLoading } = useQuery({
        queryKey: ['emails', currentFolder, page, searchTerm],
        queryFn: () => {
            const filter: EmailFilter = {
                page,
                limit: 50,
                search: searchTerm,
                channel: 'email',
                // For drafts, the same /notifications endpoint is used with category='draft'
                category: currentFolder === 'drafts' ? 'draft' : currentFolder,
            };

            if (currentFolder === 'inbox') {
                filter.received_by = user?.id || '';
            }

            return emailApi.list(filter);
        }
    });


    const { mutate: getEmailById } = useMutation({
        mutationFn: (id: string) => emailApi.getById(id),
        onSuccess: (response) => {
            setSelectedEmail(response.data || null);
        },
        onError: (error) => {
            console.error(error);
        }
    });

    const { mutate: getAttachment } =
        useMutation({
            mutationFn: (id: string) => emailApi.attachmentById(id),

            onSuccess: (blob: any, id) => {
                const fileName =
                    selectedEmail?.attachments?.find(att => att.id === id)?.filename ||
                    'attachment';

                const url = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();

                window.URL.revokeObjectURL(url);
            },

            onError: (error) => {
                console.error('Attachment download failed:', error);
            }
        });

    const emails = emailData?.data || [];

    // Helpers
    const getSender = (email: Email) => {
        if (email.direction === 'outbound') return 'Me';
        // Use sent_by_user from API response (inbound emails)
        if (email.sent_by_user) {
            const { first_name, last_name, email: userEmail } = email.sent_by_user;
            const fullName = [first_name, last_name].filter(Boolean).join(' ');
            return fullName || userEmail || 'Unknown';
        }
        return email.sender || 'Unknown';
    };

    const getRecipients = (email: Email, type: 'to' | 'cc' | 'bcc') => {
        return email.recipients
            ?.filter(r => r.type === type)
            .map(r => r.email)
            .join(', ') || '';
    };

    // Reset compose form
    const resetCompose = () => {
        setComposeTo('');
        setComposeCc('');
        setComposeBcc('');
        setComposeSubject('');
        setComposeBody('');
        setAttachments([]);
        setEditingDraftId(null);
    };

    const closeCompose = () => {
        setIsComposeOpen(false);
        resetCompose();
    };

    // Send Email Mutation
    const sendEmailMutation = useMutation({
        mutationFn: (data: { to: string; cc?: string; bcc?: string; subject: string; body: string; attachments?: File[] }) =>
            emailApi.send(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            closeCompose();
        },
        onError: (error) => {
            console.error('Failed to send email:', error);
        }
    });

    // Save Draft Mutation (new draft)
    const saveDraftMutation = useMutation({
        mutationFn: (data: { to?: string; cc?: string; bcc?: string; subject?: string; body?: string; attachments?: File[] }) =>
            emailApi.saveDraft(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            closeCompose();
        },
        onError: (error) => {
            console.error('Failed to save draft:', error);
        }
    });

    // Update Draft Mutation (existing draft)
    const updateDraftMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { to?: string; cc?: string; bcc?: string; subject?: string; body?: string; attachments?: File[] } }) =>
            emailApi.updateDraft(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            closeCompose();
        },
        onError: (error) => {
            console.error('Failed to update draft:', error);
        }
    });

    // Send Draft Mutation (send an existing draft)
    const sendDraftMutation = useMutation({
        mutationFn: (id: string) => emailApi.sendDraft(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            closeCompose();
        },
        onError: (error) => {
            console.error('Failed to send draft:', error);
        }
    });

    const handleSendEmail = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDraftId) {
            // Send the existing draft directly
            sendDraftMutation.mutate(editingDraftId);
        } else {
            sendEmailMutation.mutate({
                to: composeTo,
                cc: composeCc || undefined,
                bcc: composeBcc || undefined,
                subject: composeSubject,
                body: composeBody,
                attachments: attachments
            });
        }
    };

    const handleSaveDraft = () => {
        const draftData = {
            to: composeTo || undefined,
            cc: composeCc || undefined,
            bcc: composeBcc || undefined,
            subject: composeSubject || undefined,
            body: composeBody || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
        };

        if (editingDraftId) {
            updateDraftMutation.mutate({ id: editingDraftId, data: draftData });
        } else {
            saveDraftMutation.mutate(draftData);
        }
    };

    // Open a draft for editing in the compose window
    const openDraftForEditing = (email: Email) => {
        setEditingDraftId(email.id);
        setComposeTo(getRecipients(email, 'to'));
        setComposeCc(getRecipients(email, 'cc'));
        setComposeBcc(getRecipients(email, 'bcc'));
        setComposeSubject(email.subject || '');
        setComposeBody(email.body || '');
        setAttachments([]);
        setIsComposeOpen(true);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const stripHtml = (html: string) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(Array.from(e.target.files));
        }
    };

    const starMutation = useMutation({
        mutationFn: ({ id, is_starred }: { id: string; is_starred: boolean }) =>
            emailApi.star(id, is_starred),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
        },
    });

    const toggleStar = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const email = emails.find((em: Email) => em.id === id);
        if (email) {
            starMutation.mutate({ id, is_starred: !email.is_starred });
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => emailApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            setSelectedEmail(null);
        },
    });

    const hardDeleteMutation = useMutation({
        mutationFn: (id: string) => emailApi.hardDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            setSelectedEmail(null);
        },
    });

    const deleteEmail = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const email = emails.find((em: Email) => em.id === id);
        if (email?.category === 'trash') {
            if (window.confirm('Are you sure you want to delete this email permanently?')) {
                hardDeleteMutation.mutate(id);
            }
        } else {
            if (window.confirm('Are you sure you want to delete this email?')) {
                deleteMutation.mutate(id);
            }
        }
    };

    const handleReply = () => {
        if (!selectedEmail) return;
        const sender = getSender(selectedEmail);
        setEditingDraftId(null);
        setComposeTo(sender);
        setComposeSubject(selectedEmail.subject.startsWith('Re: ') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`);
        setComposeBody(`<br/><br/>---<br/>On ${new Date(selectedEmail.created_at).toLocaleString()}, ${sender} wrote:<br/><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 0;">${selectedEmail.body}</blockquote>`);
        setIsComposeOpen(true);
    };

    const handleForward = () => {
        if (!selectedEmail) return;
        setEditingDraftId(null);
        setComposeTo('');
        setComposeSubject(selectedEmail.subject.startsWith('Fwd: ') ? selectedEmail.subject : `Fwd: ${selectedEmail.subject}`);
        setComposeBody(`<br/><br/>---<br/>Forwarded message from ${getSender(selectedEmail)}:<br/><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 0;">${selectedEmail.body}</blockquote>`);
        setIsComposeOpen(true);
    };

    const isSavingDraft = saveDraftMutation.isPending || updateDraftMutation.isPending;
    const isSendingDraft = sendDraftMutation.isPending;
    const isSending = sendEmailMutation.isPending || isSendingDraft;

    const folderConfig: { key: Folder; label: string; icon: React.ReactNode }[] = [
        { key: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
        { key: 'sent', label: 'Sent', icon: <Send className="w-4 h-4" /> },
        { key: 'drafts', label: 'Drafts', icon: <FileText className="w-4 h-4" /> },
        { key: 'trash', label: 'Trash', icon: <Trash className="w-4 h-4" /> },
    ];

    return (
        <div className="h-[calc(100vh-100px)] flex bg-card rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Sidebar */}
            <div className="w-64 bg-card border-r border-slate-200 flex flex-col hidden md:flex">
                <div className="p-4">
                    <Button
                        onClick={() => { resetCompose(); setIsComposeOpen(true); }}
                        className="w-full"
                        >
                        <Plus className="w-5 h-5" />
                        <span>Compose</span>
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-3 space-y-1">
                        {folderConfig.map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => { setCurrentFolder(key); setSelectedEmail(null); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFolder === key ? 'bg-primary/5 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                {icon}
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Email List */}
            <div className={`${selectedEmail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 border-r border-slate-200 bg-card`}>
                <div className="p-4 border-b border-slate-200">
                    <div className="md:hidden mb-4 flex gap-2">
                        <button onClick={() => { resetCompose(); setIsComposeOpen(true); }} className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium">Compose</button>
                        <select
                            value={currentFolder}
                            onChange={(e) => { setCurrentFolder(e.target.value as Folder); setSelectedEmail(null); }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 text-sm"
                        >
                            <option value="inbox">Inbox</option>
                            <option value="sent">Sent</option>
                            <option value="drafts">Drafts</option>
                            <option value="trash">Trash</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search mail..."
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
                    ) : emails.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <p>No emails found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {emails.map((email: Email) => (
                                <div
                                    key={email.id}
                                    onClick={() => {
                                        if (currentFolder === 'drafts') {
                                            openDraftForEditing(email);
                                        } else {
                                            getEmailById(email.id);
                                        }
                                    }}
                                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedEmail?.id === email.id ? 'bg-violet-50 hover:bg-violet-50' : ''} ${!email.is_read ? 'bg-slate-50' : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className={`text-sm truncate pr-2 ${!email.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                            {currentFolder === 'drafts'
                                                ? (getRecipients(email, 'to') || 'No recipient')
                                                : getSender(email)}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {email.status === 'failed' && (
                                                <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Failed
                                                </span>
                                            )}
                                            {(email.is_draft || currentFolder === 'drafts') && (
                                                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                                                    <FileText className="w-3 h-3" />
                                                    Draft
                                                </span>
                                            )}
                                            <span className={`text-xs whitespace-nowrap ${!email.is_read ? 'text-primary font-medium' : 'text-slate-400'}`}>
                                                {new Date(email.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm mb-1 truncate ${!email.is_read ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                                                {email.subject || '(No subject)'}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {stripHtml(email.body)}
                                            </p>
                                        </div>
                                        {currentFolder !== 'drafts' && (
                                            <div className="ml-2 flex flex-col gap-2">
                                                <button
                                                    onClick={(e) => toggleStar(e, email.id)}
                                                    className={`hover:bg-slate-200 p-1 rounded-full transition-colors ${email.is_starred ? 'text-yellow-400' : 'text-slate-300'}`}
                                                >
                                                    <Star className="w-4 h-4 fill-current" />
                                                </button>
                                            </div>
                                        )}
                                        {currentFolder === 'drafts' && (
                                            <button
                                                onClick={(e) => deleteEmail(e, email.id)}
                                                className="ml-2 p-1 hover:bg-red-50 rounded-full text-slate-300 hover:text-red-500 transition-colors"
                                                title="Delete draft"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Email Detail / Reading Pane */}
            <div className={`${!selectedEmail ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-card overflow-hidden`}>
                {selectedEmail ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-white">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-4 mb-4">
                                    <button onClick={() => setSelectedEmail(null)} className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                    <h2 className="text-xl font-bold text-slate-900 truncate">
                                        {selectedEmail.subject}
                                    </h2>
                                    <div className="flex items-center gap-1">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 uppercase">
                                            {selectedEmail.category || 'Inbox'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-primary font-bold">
                                            {getSender(selectedEmail).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900">{getSender(selectedEmail)}</span>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                To: {getRecipients(selectedEmail, 'to')}
                                            </div>
                                            {getRecipients(selectedEmail, 'cc') && (
                                                <div className="text-xs text-slate-400">
                                                    Cc: {getRecipients(selectedEmail, 'cc')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-xs">{new Date(selectedEmail.created_at).toLocaleString()}</span>
                                        <div className="flex items-center border-l border-slate-200 pl-2 ml-2 gap-1">
                                            <button
                                                onClick={handleReply}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                                                title="Reply"
                                            >
                                                <Reply className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={handleForward}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                                                title="Forward"
                                            >
                                                <Forward className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => deleteEmail(e, selectedEmail.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Delete">
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div
                                className="prose max-w-none text-slate-800"
                                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                            />

                            {(selectedEmail.attachments && selectedEmail.attachments.length > 0) && (
                                <div className="mt-8 pt-6 border-t border-slate-200">
                                    <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                                        <Paperclip className="w-4 h-4" />
                                        Attachments ({selectedEmail.attachments.length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {selectedEmail.attachments.map(attachment => (
                                            <div key={attachment.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg border border-slate-100">
                                                    <Paperclip className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{attachment.filename}</p>
                                                    <p className="text-xs text-slate-500">{attachment.size ? formatBytes(attachment.size) : ''}</p>
                                                </div>
                                                {attachment.url && (
                                                    <Download className="w-4 h-4 cursor-pointer" onClick={() => getAttachment(attachment.id || '')} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Mail className="w-8 h-8" />
                        </div>
                        <p className="text-lg font-medium text-slate-600">Select an email to read</p>
                    </div>
                )}
            </div>


            {/* Compose Modal */}
            {isComposeOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-slate-900">
                                {editingDraftId ? 'Edit Draft' : 'New Message'}
                            </h3>
                            <button
                                onClick={closeCompose}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSendEmail} className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                                    <input
                                        type="email"
                                        value={composeTo}
                                        onChange={e => setComposeTo(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="recipient@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CC (optional)</label>
                                    <input
                                        type="email"
                                        value={composeCc}
                                        onChange={e => setComposeCc(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="cc@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">BCC (optional)</label>
                                    <input
                                        type="email"
                                        value={composeBcc}
                                        onChange={e => setComposeBcc(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="bcc@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={composeSubject}
                                        onChange={e => setComposeSubject(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Subject"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                    <RichTextEditor
                                        value={composeBody}
                                        onChange={setComposeBody}
                                        placeholder="Write your message here..."
                                        className="flex-1 min-h-[250px]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Attachments</label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-slate-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-violet-50 file:text-violet-700
                                            hover:file:bg-violet-100"
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between gap-3">
                                {/* Save as Draft button */}
                                <button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    disabled={isSavingDraft}
                                    className="px-4 py-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSavingDraft ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {editingDraftId ? 'Update Draft' : 'Save as Draft'}
                                </button>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={closeCompose}
                                        className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSending || (!composeTo && !editingDraftId)}
                                        className="px-6 py-2 bg-primary hover:bg-violet-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Send Message
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
