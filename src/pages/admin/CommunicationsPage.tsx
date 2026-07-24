import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Email, EmailAttachment } from "../../types";
import { emailApi, notificationTrackApi, smsApi } from "../../api/admin";
import { useTranslation } from "react-i18next";
import {
  Mail,
  MessageSquare,
  Send,
  Trash,
  Plus,
  Search,
  Reply,
  Forward,
  Paperclip,
  X,
  Loader2,
  AlertCircle,
  Download,
  Save,
  Funnel,
  CheckCircle,
  RotateCcw,
  Settings,
} from "lucide-react";
import { RichTextEditor } from "../../components/RichTextEditor";
import { Button, Card } from "@/components/ui";
import { EmailChipInput } from "@/components/ui/EmailChipInput";
import { ConfirmationModal } from "../../components/common/ConfirmationModal";
import DOMPurify from "dompurify";
import { FieldWrapper } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/Datepicker";
import { DateFormats } from "@/constants/dateFormat";
import { cn } from "@/lib/utils";
import { Input } from "@/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { Select } from "@/components/ui/SelectInput";
import { format } from "date-fns";
import { PERMISSIONS } from "@/constants/permissions";
import usePermissions from "@/hooks/usePermissions";

type Category = "inbox" | "sent" | "draft" | "trash";
type ComposeChannel = "email" | "sms";

export const CommunicationsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [currentCategory, setCurrentCategory] = useState<Category>("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewEmail, setIsNewEmail] = useState(true);

  const [composeChannel, setComposeChannel] = useState<ComposeChannel>("email");
  const [composeTo, setComposeTo] = useState<string[]>([]);
  const [composeCc, setComposeCc] = useState<string[]>([]);
  const [composeBcc, setComposeBcc] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [smsCountryCode, setSmsCountryCode] = useState("+91");
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("");
  const [smsErrors, setSmsErrors] = useState<{ to?: string; body?: string }>(
    {},
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [isCloningAttachments, setIsCloningAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
    isPermanent: boolean;
  }>({
    isOpen: false,
    id: null,
    isPermanent: false,
  });

  const [channel, setChannel] = useState<"" | "email" | "sms">("");
  const [page, setPage] = useState<number>(1);

  const [filters, setFilters] = useState({
    category: "inbox" as Category,
    status: "" as "" | "sent" | "failed",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    recipient: "",
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  const canUpdate = hasPermission(PERMISSIONS.COMMUNICATION_TRACK_UPDATE);

  const resetFilters = () => {
    const filtersToSet: any = {
      category: "inbox",
      status: "",
      startDate: undefined,
      endDate: undefined,
      recipient: "",
    };
    setFilters(filtersToSet);
    setAppliedFilters(filtersToSet);
  };

  const { data: notificationData, isFetching } = useQuery({
    queryKey: ["notifications", page, appliedFilters, channel],
    queryFn: () =>
      notificationTrackApi.list({
        page,
        limit: 100,
        category: appliedFilters.category,
        channel: channel,
        status: appliedFilters.status,
        start_date: appliedFilters.startDate
          ? `${format(appliedFilters.startDate, "yyyy-MM-dd")}T00:00:00Z`
          : undefined,
        end_date: appliedFilters.endDate
          ? `${format(appliedFilters.endDate, "yyyy-MM-dd")}T23:59:59Z`
          : undefined,
        recipient: appliedFilters.recipient,
      }),
  });

  const { mutate: getNotificationById } = useMutation({
    mutationFn: (id: string) => notificationTrackApi.getById(id),
    onSuccess: (response) => {
      setSelectedEmail(response.data || null);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const { mutate: getAttachment } = useMutation({
    mutationFn: (id: string) => emailApi.attachmentById(id),

    onSuccess: (blob: any, id) => {
      const fileName =
        selectedEmail?.attachments?.find((att) => att.id === id)?.filename ||
        "attachment";

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();

      window.URL.revokeObjectURL(url);
    },

    onError: (error) => {
      console.error("Attachment download failed:", error);
    },
  });

  const notifications = notificationData?.data || [];

  // Helpers
  const getSender = (email: Email) => {
    if (email.direction === "outbound") return "Me";
    // Use sent_by_user from API response (inbound emails)
    if (email.sent_by_user) {
      const { first_name, last_name, email: userEmail } = email.sent_by_user;
      const fullName = [first_name, last_name].filter(Boolean).join(" ");
      return fullName || userEmail || "Unknown";
    }
    return email.sender || "Unknown";
  };

  const getRecipients = (email: Email, type: "to" | "cc" | "bcc") => {
    return (
      email.recipients
        ?.filter((r) => r.type === type)
        .map((r) => r.email)
        .join(", ") || ""
    );
  };

  const getRecipientList = (notification: Email, type: "to" | "cc" | "bcc") =>
    notification.recipients
      ?.filter((r) => r.type === type)
      .map((r) => r.email)
      .filter(Boolean) || [];

  const isSmsNotification = (notification?: Email | null) =>
    notification?.channel?.toLowerCase() === "sms";

  const getNotificationIcon = (notification: Email) =>
    isSmsNotification(notification) ? (
      <MessageSquare className="w-4 h-4 text-sky-600" />
    ) : (
      <Mail className="w-4 h-4 text-primary" />
    );

  const getFailureMessage = (notification: Email) => {
    const recipientError = notification.recipients?.find((r) => r.error)?.error;
    const extraError =
      (notification as any).error ||
      (notification as any).error_message ||
      (notification as any).failure_reason ||
      (notification as any).failed_reason ||
      (notification as any).provider_error;

    return recipientError || extraError || "";
  };

  const resetCompose = () => {
    setComposeTo([]);
    setComposeCc([]);
    setComposeBcc([]);
    setComposeSubject("");
    setComposeBody("");
    setSmsCountryCode("+91");
    setSmsPhoneNumber("");
    setSmsErrors({});
    setAttachments([]);
    setEditingDraftId(null);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
    resetCompose();
  };

  const sendEmailMutation = useMutation({
    mutationFn: (data: {
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      attachments?: File[];
    }) => emailApi.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      closeCompose();
    },
    onError: (error) => {
      console.error("Failed to send email:", error);
    },
  });

  const sendSMSMutation = useMutation({
    mutationFn: (data: { to: string; body: string }) => smsApi.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      closeCompose();
    },
    onError: (error) => {
      console.error("Failed to send SMS:", error);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (data: {
      to?: string;
      cc?: string;
      bcc?: string;
      subject?: string;
      body?: string;
      attachments?: File[];
    }) => emailApi.saveDraft(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      closeCompose();
    },
    onError: (error) => {
      console.error("Failed to save draft:", error);
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        to?: string;
        cc?: string;
        bcc?: string;
        subject?: string;
        body?: string;
        attachments?: File[];
      };
    }) => emailApi.updateDraft(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      closeCompose();
    },
    onError: (error) => {
      console.error("Failed to update draft:", error);
    },
  });

  const sendDraftMutation = useMutation({
    mutationFn: (id: string) => emailApi.sendDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      closeCompose();
    },
    onError: (error) => {
      console.error("Failed to send draft:", error);
    },
  });

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (composeChannel === "sms") {
      handleSendSMS();
      return;
    }

    sendEmailMutation.mutate({
      to: composeTo.join(","),
      cc: composeCc.length > 0 ? composeCc.join(",") : undefined,
      bcc: composeBcc.length > 0 ? composeBcc.join(",") : undefined,
      subject: composeSubject,
      body: composeBody,
      attachments: attachments,
    });
  };

  const handleSendSMS = () => {
    const cleanedPhone = smsPhoneNumber.replace(/[\s\-()]/g, "");
    const newErrors: { to?: string; body?: string } = {};

    if (!cleanedPhone) {
      newErrors.to = "Phone number is required";
    } else if (!/^\d{4,15}$/.test(cleanedPhone.replace(/^0+/, ""))) {
      newErrors.to = "Enter a valid phone number without country code";
    }

    if (!composeBody.trim()) {
      newErrors.body = "Message cannot be empty";
    }

    if (Object.keys(newErrors).length > 0) {
      setSmsErrors(newErrors);
      return;
    }

    setSmsErrors({});
    sendSMSMutation.mutate({
      to: `${smsCountryCode}${cleanedPhone.replace(/^0+/, "")}`,
      body: composeBody,
    });
  };

  const handleSaveDraft = () => {
    const draftData = {
      to: composeTo.length > 0 ? composeTo.join(",") : undefined,
      cc: composeCc.length > 0 ? composeCc.join(",") : undefined,
      bcc: composeBcc.length > 0 ? composeBcc.join(",") : undefined,
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

  const fetchAttachmentsAsFiles = async (
    emailAttachments: EmailAttachment[],
  ): Promise<File[]> => {
    try {
      const filePromises = emailAttachments.map(async (attachment) => {
        const blob = await emailApi.attachmentById(attachment.id!);
        return new File([blob as unknown as Blob], attachment.filename, {
          type: (blob as any).type || "application/octet-stream",
        });
      });
      return await Promise.all(filePromises);
    } catch (error) {
      console.error("Failed to fetch attachments as files:", error);
      return [];
    }
  };

  const splitEmails = (str: string): string[] =>
    str
      ? str
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const openDraftForEditing = async (email: Email) => {
    resetCompose();
    setComposeChannel("email");
    setEditingDraftId(email.id);
    setComposeTo(splitEmails(getRecipients(email, "to")));
    setComposeCc(splitEmails(getRecipients(email, "cc")));
    setComposeBcc(splitEmails(getRecipients(email, "bcc")));
    setComposeSubject(email.subject || "");
    setComposeBody(email.body || "");

    if (email.attachments && email.attachments.length > 0) {
      setIsCloningAttachments(true);
      const files = await fetchAttachmentsAsFiles(email.attachments);
      setAttachments(files);
      setIsCloningAttachments(false);
    }

    setIsComposeOpen(true);
  };

  const openRetryForNotification = async (notification: Email) => {
    resetCompose();
    const recipient = getRecipientList(notification, "to")[0] || "";
    const isSms = isSmsNotification(notification);

    setComposeChannel(isSms ? "sms" : "email");
    setComposeBody(notification.body_html || notification.body || "");
    setComposeSubject(notification.subject || "");
    setIsNewEmail(false);

    if (isSms) {
      const countryMatch = recipient.match(/^(\+\d{1,4})(.*)$/);
      if (countryMatch) {
        setSmsCountryCode(countryMatch[1]);
        setSmsPhoneNumber(countryMatch[2].replace(/\D/g, ""));
      } else {
        setSmsPhoneNumber(recipient.replace(/\D/g, ""));
      }
    } else {
      setComposeTo(getRecipientList(notification, "to"));
      setComposeCc(getRecipientList(notification, "cc"));
      setComposeBcc(getRecipientList(notification, "bcc"));

      if (notification.attachments && notification.attachments.length > 0) {
        setIsCloningAttachments(true);
        const files = await fetchAttachmentsAsFiles(notification.attachments);
        setAttachments(files);
        setIsCloningAttachments(false);
      }
    }

    setIsComposeOpen(true);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);

      setAttachments((prev) => {
        const updated = [...prev, ...newFiles];

        return updated;
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      console.log("[Attachment] No files selected or empty FileList");
    }
  };

  const handlePreviewAttachment = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedEmail(null);
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => emailApi.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedEmail(null);
    },
  });

  const deleteEmail = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const email = notifications.find((em: Email) => em.id === id);
    setDeleteConfirmation({
      isOpen: true,
      id,
      isPermanent: email?.category === "trash",
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.id) {
      if (deleteConfirmation.isPermanent) {
        hardDeleteMutation.mutate(deleteConfirmation.id);
      } else {
        deleteMutation.mutate(deleteConfirmation.id);
      }
    }
    setDeleteConfirmation({ isOpen: false, id: null, isPermanent: false });
  };

  const handleReply = async () => {
    if (!selectedEmail || isSmsNotification(selectedEmail)) return;
    const replyTo =
      selectedEmail.direction === "outbound"
        ? getRecipients(selectedEmail, "to")
        : selectedEmail.sent_by_user?.email || selectedEmail.sender || "";
    const sender = getSender(selectedEmail);
    resetCompose();
    setComposeChannel("email");
    setEditingDraftId(null);
    setComposeTo(splitEmails(replyTo));
    setComposeSubject(
      selectedEmail.subject.startsWith("Re: ")
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`,
    );
    setComposeBody(
      `<br/><br/>---<br/>On ${new Date(selectedEmail.created_at).toLocaleString()}, ${sender} wrote:<br/><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 0;">${selectedEmail.body_html || selectedEmail.body}</blockquote>`,
    );

    if (selectedEmail.attachments && selectedEmail.attachments.length > 0) {
      setIsCloningAttachments(true);
      const files = await fetchAttachmentsAsFiles(selectedEmail.attachments);
      setAttachments(files);
      setIsCloningAttachments(false);
    }

    setIsComposeOpen(true);
    setIsNewEmail(false);
  };

  const handleForward = async () => {
    if (!selectedEmail || isSmsNotification(selectedEmail)) return;
    resetCompose();
    setComposeChannel("email");
    setEditingDraftId(null);
    // composeTo stays [] — user picks forward recipient
    setComposeSubject(
      selectedEmail.subject.startsWith("Fwd: ")
        ? selectedEmail.subject
        : `Fwd: ${selectedEmail.subject}`,
    );
    setComposeBody(
      `<br/><br/>---<br/>Forwarded message from ${getSender(selectedEmail)}:<br/><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 0;">${selectedEmail.body_html || selectedEmail.body}</blockquote>`,
    );

    if (selectedEmail.attachments && selectedEmail.attachments.length > 0) {
      setIsCloningAttachments(true);
      const files = await fetchAttachmentsAsFiles(selectedEmail.attachments);
      setAttachments(files);
      setIsCloningAttachments(false);
    }

    setIsComposeOpen(true);
    setIsNewEmail(false);
  };

  const filteredNotifications = React.useMemo(() => {
    if (!searchTerm.trim()) return notifications;

    const search = searchTerm.toLowerCase();

    return notifications.filter((item) => {
      const subject = (
        isSmsNotification(item) ? "SMS" : item.subject || "(No subject)"
      ).toLowerCase();
      return (
        getSender(item).toLowerCase().includes(search) ||
        (subject ?? "").toLowerCase().includes(search) ||
        stripHtml(item.body ?? "")
          .toLowerCase()
          .includes(search) ||
        getRecipients(item, "to").toLowerCase().includes(search)
      );
    });
  }, [notifications, searchTerm]);

  const isSavingDraft =
    saveDraftMutation.isPending || updateDraftMutation.isPending;
  const isSendingDraft = sendDraftMutation.isPending;
  const isSending =
    sendEmailMutation.isPending || sendSMSMutation.isPending || isSendingDraft;

  return (
    <div className="h-[calc(100vh-100px)] flex bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col hidden md:flex">
        {canUpdate ? (
          <div className="p-4">
            <Button
              onClick={() => {
                resetCompose();
                setComposeChannel("email");
                setIsComposeOpen(true);
                setIsNewEmail(true);
              }}
              className="w-full"
              leftIcon={<Plus className="w-5 h-5" />}
            >
              <span>Compose</span>
            </Button>
          </div>
        ) : null}

        <Tabs
          value={channel}
          onValueChange={(value) => {
            setChannel(value as "" | "email" | "sms");
            setPage(1);
          }}
          className="w-full p-2"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="">All</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1 overflow-y-auto py-2">
          <Card className="m-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Funnel size={12} />
                <span className="text-sm font-semibold">Filter</span>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm text-muted-foreground hover:text-black cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <FieldWrapper label="Category">
                <Select
                  placeholder="Select Category"
                  value={filters.category}
                  onChange={(value: any) => {
                    setFilters((prev) => ({
                      ...prev,
                      category: value,
                    }));
                    setSelectedEmail(null);
                  }}
                  options={[
                    { label: "Inbox", value: "inbox" },
                    { label: "Sent", value: "sent" },
                    { label: "Draft", value: "draft" },
                    { label: "Trash", value: "trash" },
                  ]}
                  size="sm"
                />
              </FieldWrapper>
              <FieldWrapper label="Status">
                <Select
                  placeholder="Select Status"
                  value={filters.status}
                  onChange={(value: any) => {
                    setFilters((prev) => ({
                      ...prev,
                      status: value,
                    }));
                  }}
                  options={[
                    { label: "All", value: "" },
                    { label: "Sent", value: "sent" },
                    { label: "Failed", value: "failed" },
                  ]}
                  size="sm"
                />
              </FieldWrapper>
              <FieldWrapper label="Start Date">
                <DatePicker
                  placeholder="Select Start Date"
                  onChange={(val) => {
                    setFilters((prev) => ({
                      ...prev,
                      startDate: val,
                    }));
                  }}
                  value={filters.startDate}
                  format={DateFormats.DATE}
                />
              </FieldWrapper>
              <FieldWrapper label="End Date">
                <DatePicker
                  placeholder="Select End Date"
                  onChange={(val) => {
                    setFilters((prev) => ({
                      ...prev,
                      endDate: val,
                    }));
                  }}
                  value={filters.endDate}
                  format={DateFormats.DATE}
                />
              </FieldWrapper>
              <FieldWrapper label="Recipients">
                <Input
                  value={filters.recipient}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      recipient: e.target.value,
                    }))
                  }
                  placeholder="Enter recipient"
                  className="bg-background"
                />
              </FieldWrapper>
            </div>
            <div className="flex items-center justify-between mt-4">
              <Button
                onClick={() => {
                  setPage(1);
                  setAppliedFilters(filters);
                }}
                size={"xs"}
              >
                Apply Filters
              </Button>
              <Button
                variant={"ghost"}
                onClick={() => {
                  resetFilters();
                }}
                size={"xs"}
              >
                Clear
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div
        className={`${selectedEmail ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-96 border-r border-border bg-card`}
      >
        <div className="p-4 border-b border-border">
          <div className="md:hidden mb-4 flex gap-2">
            <button
              onClick={() => {
                resetCompose();
                setComposeChannel("email");
                setIsComposeOpen(true);
              }}
              className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium"
            >
              Compose
            </button>
            <select
              value={currentCategory}
              onChange={(e) => {
                setCurrentCategory(e.target.value as Category);
                setSelectedEmail(null);
              }}
              className="bg-slate-50 border border-border rounded-lg px-2 text-sm"
            >
              <option value="inbox">{t("email.inbox")}</option>
              <option value="sent">{t("email.sent")}</option>
              <option value="draft">{t("email.drafts")}</option>
              <option value="trash">{t("email.trash")}</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={"Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-background">
          {isFetching ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 ">
              {filteredNotifications.map((email: Email) => (
                <div
                  key={email.id}
                  onClick={() => {
                    if (currentCategory === "draft") {
                      openDraftForEditing(email);
                    } else {
                      getNotificationById(email.id);
                    }
                  }}
                  className={`p-4 cursor-pointer m-2 border border-border rounded-lg hover:bg-primary/5  transition-colors bg-card ${selectedEmail?.id === email.id ? " border border-primary bg-primary/5" : ""} `}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="min-w-0 flex items-center gap-2 pr-2">
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          isSmsNotification(email)
                            ? "bg-sky-50"
                            : "bg-primary/10",
                        )}
                        title={
                          isSmsNotification(email)
                            ? "SMS notification"
                            : "Email notification"
                        }
                      >
                        {getNotificationIcon(email)}
                      </span>
                      <h3
                        className={`text-sm truncate ${!email.is_read ? "font-bold " : "font-medium "}`}
                      >
                        {currentCategory === "draft"
                          ? getRecipients(email, "to") || "No recipient"
                          : getSender(email)}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {email.status === "failed" ? (
                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {t("common.failed")}
                        </span>
                      ) : email.status === "sent" ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle className="w-3 h-3" />
                          {t("common.sent")}
                        </span>
                      ) : null}

                      <span
                        className={`text-xs whitespace-nowrap ${!email.is_read ? "text-primary font-medium" : "text-slate-400"}`}
                      >
                        {new Date(email.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm mb-1 truncate ${!email.is_read ? " font-medium" : "font-normal"}`}
                      >
                        {isSmsNotification(email)
                          ? "SMS"
                          : email.subject || "(No subject)"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {stripHtml(email.body)}
                      </p>
                    </div>

                    {currentCategory === "draft" && (
                      <button
                        onClick={(e) => deleteEmail(e, email.id)}
                        className="ml-2 p-1 hover:bg-red-50 rounded-full text-slate-300 hover:text-red-500 transition-colors"
                        title={t("email.deleteDraft")}
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

      <div
        className={`${!selectedEmail ? "hidden lg:flex" : "flex"} flex-1 flex-col bg-card overflow-hidden`}
      >
        {selectedEmail ? (
          <>
            <div className="px-6 py-3 border-b border-border flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5  rounded text-xs font-medium text-slate-600 uppercase ",
                        selectedEmail.status === "failed"
                          ? "text-red-600 bg-red-50 "
                          : "bg-green-50 text-green-600 border border-green-600",
                      )}
                    >
                      {selectedEmail.status}
                    </span>
                    <span className="text-xs">
                      {new Date(selectedEmail.created_at).toLocaleString()}
                    </span>
                  </div>
                  {canUpdate ? (
                    <div className="flex items-center gap-1">
                      {!isSmsNotification(selectedEmail) && (
                        <>
                          <button
                            onClick={handleReply}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                            title={t("email.reply")}
                          >
                            <Reply className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleForward}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                            title={t("email.forward")}
                          >
                            <Forward className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => deleteEmail(e, selectedEmail.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                        title={t("common.delete")}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                  <h2 className="text-xl font-bold break-words">
                    {isSmsNotification(selectedEmail)
                      ? "SMS Notification"
                      : selectedEmail.subject}
                  </h2>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        isSmsNotification(selectedEmail)
                          ? "bg-sky-50 text-sky-600"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {isSmsNotification(selectedEmail) ? (
                        <MessageSquare className="w-5 h-5" />
                      ) : (
                        getSender(selectedEmail).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold ">
                          {getSender(selectedEmail)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 wrap-break-word">
                        To {getRecipients(selectedEmail, "to")}
                      </div>
                      {getRecipients(selectedEmail, "cc") && (
                        <div className="text-xs text-slate-400 wrap-break-word">
                          {t("email.cc")} {getRecipients(selectedEmail, "cc")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {selectedEmail.template_code ? (
                  <div className="flex items-center gap-2 mt-3 pt-1 border-t">
                    <Settings className="w-4 h-4 text-primary" />
                    <span className="text-sm ">
                      {selectedEmail.template_code}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-background">
              {selectedEmail.status === "failed" && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        Delivery error
                      </div>
                      <p className="mt-1">
                        {getFailureMessage(selectedEmail) || "Delivery failed"}
                      </p>
                    </div>
                    {canUpdate ? (
                      <button
                        type="button"
                        onClick={() => openRetryForNotification(selectedEmail)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              <div
                className="prose max-w-none bg-card border border-border p-4 rounded-lg"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    selectedEmail.body_html || selectedEmail.body || "",
                  ),
                }}
              />

              {selectedEmail.attachments &&
                selectedEmail.attachments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      {t("email.attachments")}{" "}
                      {selectedEmail.attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedEmail.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="p-3 bg-slate-50 border border-border rounded-lg flex items-center gap-3"
                        >
                          <div className="p-2 bg-white rounded-lg border border-slate-100">
                            <Paperclip className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-slate-500">
                              {attachment.size
                                ? formatBytes(attachment.size)
                                : ""}
                            </p>
                          </div>
                          {attachment.url && (
                            <Download
                              className="w-4 h-4 cursor-pointer"
                              onClick={() => getAttachment(attachment.id || "")}
                            />
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
            <p className="text-lg font-medium text-slate-600">
              Select a notification to read
            </p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {composeChannel === "sms" ? (
                    <MessageSquare className="w-[18px] h-[18px] text-primary" />
                  ) : (
                    <Mail className="w-[18px] h-[18px] text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] leading-tight">
                    {editingDraftId
                      ? "Edit Draft"
                      : isNewEmail
                        ? composeChannel === "sms"
                          ? "New SMS"
                          : "New Message"
                        : isCloningAttachments
                          ? "Cloning attachments..."
                          : composeChannel === "sms"
                            ? "New SMS"
                            : composeSubject}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editingDraftId
                      ? "Update and save your draft"
                      : "Compose and send a notification"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCompose}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleSendEmail}
              className="flex-1 flex flex-col overflow-hidden"
              noValidate
            >
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                {isNewEmail && !editingDraftId && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setComposeChannel("email")}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                        composeChannel === "email"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Mail className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">
                          Email
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Subject, CC/BCC and attachments
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposeChannel("sms")}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                        composeChannel === "sms"
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50">
                        <MessageSquare className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">SMS</span>
                        <span className="block text-xs text-muted-foreground">
                          Short text notification
                        </span>
                      </span>
                    </button>
                  </div>
                )}

                {composeChannel === "email" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        To
                      </label>
                      <EmailChipInput
                        value={composeTo}
                        onChange={setComposeTo}
                        placeholder={t(
                          "email.recipientExampleComPressEnterOrComma",
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("email.ccOptional")}
                      </label>
                      <EmailChipInput
                        value={composeCc}
                        onChange={setComposeCc}
                        placeholder={t("email.ccExampleCom")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("email.bccOptional")}
                      </label>
                      <EmailChipInput
                        value={composeBcc}
                        onChange={setComposeBcc}
                        placeholder={t("email.bccExampleCom")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("email.subject")}
                      </label>
                      <input
                        type="text"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        className="w-full px-3 py-2 border bg-background border-b border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder={t("email.subject")}
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium mb-1">
                        {t("email.message")}
                      </label>
                      <RichTextEditor
                        value={composeBody}
                        onChange={setComposeBody}
                        placeholder={t("email.writeYourMessageHere")}
                        className="flex-1 min-h-[250px]"
                      />
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                      >
                        <Paperclip className="w-4 h-4" />
                        {t("email.attachFiles")}
                      </button>
                      {attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-primary/10 border border-primary rounded-lg text-sm"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="truncate">{file.name}</span>
                                <span className="text-xs text-slate-400 shrink-0">
                                  ({formatBytes(file.size)})
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewAttachment(file)}
                                  className="text-slate-400 hover:text-primary p-1"
                                  title={t("reports.preview")}
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttachments(
                                      attachments.filter((_, i) => i !== index),
                                    );
                                    if (fileInputRef.current)
                                      fileInputRef.current.value = "";
                                  }}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                  title={t("common.remove")}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        To phone number
                      </label>
                      <div
                        className={cn(
                          "flex rounded-lg border overflow-hidden focus-within:ring-1 focus-within:ring-primary",
                          smsErrors.to ? "border-red-500" : "border-border",
                        )}
                      >
                        <select
                          value={smsCountryCode}
                          onChange={(e) => setSmsCountryCode(e.target.value)}
                          className="shrink-0 px-2 py-2 bg-background border-r border-border text-sm focus:outline-none"
                        >
                          <option value="+91">+91</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+971">+971</option>
                          <option value="+966">+966</option>
                          <option value="+65">+65</option>
                          <option value="+60">+60</option>
                          <option value="+61">+61</option>
                          <option value="+49">+49</option>
                          <option value="+33">+33</option>
                          <option value="+81">+81</option>
                          <option value="+86">+86</option>
                          <option value="+55">+55</option>
                          <option value="+27">+27</option>
                          <option value="+234">+234</option>
                        </select>
                        <input
                          type="tel"
                          value={smsPhoneNumber}
                          onChange={(e) => {
                            setSmsPhoneNumber(e.target.value);
                            if (smsErrors.to) {
                              setSmsErrors((prev) => ({ ...prev, to: "" }));
                            }
                          }}
                          className="flex-1 px-3 py-2 text-sm focus:outline-none bg-background"
                          placeholder="9876543210"
                        />
                      </div>
                      {smsErrors.to && (
                        <p className="mt-1 text-xs text-red-500 font-medium">
                          {smsErrors.to}
                        </p>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">
                        Message
                      </label>
                      <textarea
                        value={composeBody}
                        onChange={(e) => {
                          setComposeBody(e.target.value);
                          if (smsErrors.body) {
                            setSmsErrors((prev) => ({ ...prev, body: "" }));
                          }
                        }}
                        className={cn(
                          "w-full h-40 px-3 py-2 border rounded-lg focus:ring-1 bg-background focus:ring-primary focus:border-transparent resize-none",
                          smsErrors.body ? "border-red-500" : "border-border",
                        )}
                        placeholder="Write your message here..."
                      />
                      {smsErrors.body && (
                        <p className="mt-1 text-xs text-red-500 font-medium">
                          {smsErrors.body}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-between gap-3">
                {composeChannel === "email" ? (
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
                    {editingDraftId ? "Update Draft" : "Save as Draft"}
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-3">
                  <Button variant={"ghost"} onClick={closeCompose}>
                    {t("common.cancel")}
                  </Button>
                  <button
                    type="submit"
                    disabled={
                      isSending ||
                      (composeChannel === "email" &&
                        composeTo.length === 0 &&
                        !editingDraftId)
                    }
                    className="px-6 py-2 bg-linear-to-r from-primary to-accent hover:shadow-md hover:shadow-primary/20 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {composeChannel === "sms"
                      ? "Send SMS"
                      : t("email.sendMessage")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation({ isOpen: false, id: null, isPermanent: false })
        }
        onConfirm={handleConfirmDelete}
        title={
          deleteConfirmation.isPermanent
            ? "Permanent Deletion"
            : "Delete Notification"
        }
        message={
          deleteConfirmation.isPermanent
            ? "Are you sure you want to delete this notification permanently? This action cannot be undone."
            : "Are you sure you want to delete this notification? It will be moved to the trash."
        }
        confirmText={
          deleteConfirmation.isPermanent ? "Delete Permanently" : "Delete"
        }
        isLoading={deleteMutation.isPending || hardDeleteMutation.isPending}
      />
    </div>
  );
};
