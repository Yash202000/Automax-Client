import { useEffect, useMemo, useState } from "react";

import { ArrowLeft, Copy, Save } from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, Input, Select, Textarea } from "@/components/ui";

import { notificationTemplateApi } from "@/api/admin";

import { RichTextEditor } from "@/components/RichTextEditor";
import {
  ACTION_OPTIONS,
  CHANNEL_OPTIONS,
  MODULE_OPTIONS,
} from "@/constants/template";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const getErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };

  return (
    apiError.response?.data?.error ||
    apiError.response?.data?.message ||
    apiError.message ||
    fallback
  );
};

const uniqueVariables = (variables: string[]) => Array.from(new Set(variables));

export default function TemplateFormPage() {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { settings } = useSettings();
  const SMS_MAX_LENGTH = settings?.sms_max_length ?? 160;

  const { t } = useTranslation();

  const { id } = useParams();

  const isEdit = Boolean(id);

  const { data } = useQuery({
    queryKey: ["notification-template", id],

    queryFn: () => notificationTemplateApi.getById(id!),

    enabled: !!id,
  });

  const template = data?.data;

  const { data: varsData, isLoading: isVarsLoading } = useQuery({
    queryKey: ["notification-templates", "available-variables"],
    queryFn: notificationTemplateApi.getAvailableVariables,
  });

  const availableVars: any = varsData?.data ?? {};
  const variableSyntax = varsData?.data?.syntax ?? "{{variable}}";

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    channel: "email",
    module_type: "incident",
    action_type: "escalation",
    subject_en: "",
    body_en: "",
    subject_ar: "",
    body_ar: "",
    language: "en",
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const channelOptions = CHANNEL_OPTIONS.map((option) => ({
    ...option,
    label: t(`notificationTemplates.channels.${option.value}`),
  }));

  const moduleOptions = MODULE_OPTIONS.map((option) => ({
    ...option,
    label: t(`notificationTemplates.modules.${option.value}`),
  }));

  const actionOptions = ACTION_OPTIONS.map((option) => ({
    ...option,
    label: t(`notificationTemplates.actions.${option.value}`),
  }));

  const languageOptions = [
    {
      label: t("notificationTemplates.form.languageOptions.english"),
      value: "en",
    },
    {
      label: t("notificationTemplates.form.languageOptions.arabic"),
      value: "ar",
    },
  ];

  const subjectPlaceholder =
    formData.language === "ar"
      ? t("notificationTemplates.form.placeholders.subjectArabic")
      : t("notificationTemplates.form.placeholders.subjectEnglish");

  const bodyPlaceholder =
    formData.channel === "sms"
      ? formData.language === "ar"
        ? t("notificationTemplates.form.placeholders.bodySmsArabic")
        : t("notificationTemplates.form.placeholders.bodySmsEnglish")
      : formData.language === "ar"
        ? t("notificationTemplates.form.placeholders.bodyArabic")
        : t("notificationTemplates.form.placeholders.bodyEnglish");

  const actionVariables = useMemo(() => {
    return uniqueVariables([...(availableVars[formData.action_type] ?? [])]);
  }, [availableVars, formData.action_type]);

  useEffect(() => {
    if (!template) return;

    setFormData({
      name: template.name || "",

      code: template.code || "",

      channel: template.channel || "email",

      module_type: template.module_type || "incident",

      action_type: template.action_type || "escalation",

      subject_en: template.subject_en || "",

      body_en: template.body_en || "",

      subject_ar: template.subject_ar || "",

      body_ar: template.body_ar || "",

      language: template.subject_ar || template.body_ar ? "ar" : "en",

      is_active: template.is_active ?? true,
    });
  }, [template]);

  const smsCharCount = [
    ...(formData.language === "ar" ? formData.body_ar : formData.body_en),
  ].length;

  const validate = () => {
    const e: Record<string, string> = {};
    const code = formData.code.trim();

    if (!formData.name.trim())
      e.name = t("notificationTemplates.form.validation.nameRequired");
    if (!code) e.code = t("notificationTemplates.form.validation.codeRequired");
    else if (!/^[A-Z0-9_]+$/.test(code))
      e.code = t("notificationTemplates.form.validation.codeFormat");
    if (!formData.body_en.trim() && !formData.body_ar.trim())
      e.body_en = t("notificationTemplates.form.validation.bodyRequired");

    if (formData.channel === "sms" && SMS_MAX_LENGTH > 0) {
      if ([...formData.body_en].length > SMS_MAX_LENGTH)
        e.body_en = t("notificationTemplates.form.validation.smsBodyTooLong", {
          max: SMS_MAX_LENGTH,
        });
      if ([...formData.body_ar].length > SMS_MAX_LENGTH)
        e.body_ar = t("notificationTemplates.form.validation.smsBodyTooLong", {
          max: SMS_MAX_LENGTH,
        });
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error(t("notificationTemplates.validationFailed"));
      return;
    }
    mutation.mutate(buildPayload());
  };

  const buildPayload = () => ({
    name: formData.name,
    code: formData.code,
    channel: formData.channel,
    module_type: formData.module_type,
    action_type: formData.action_type,
    subject_en: formData.subject_en,
    body_en: formData.body_en,
    subject_ar: formData.subject_ar,
    body_ar: formData.body_ar,
    is_active: formData.is_active,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? notificationTemplateApi.update(id!, payload)
        : notificationTemplateApi.create(payload),

    onSuccess: () => {
      toast.success(
        isEdit
          ? t("notificationTemplates.updateSuccess")
          : t("notificationTemplates.createSuccess"),
      );

      queryClient.invalidateQueries({
        queryKey: ["notification-templates"],
      });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["notification-template", id],
        });
      }

      navigate(-1);
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          isEdit
            ? t("notificationTemplates.updateFailed")
            : t("notificationTemplates.createFailed"),
        ),
      );
    },
  });

  const setField = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const formatVariable = (variable: string) => {
    if (variable.includes("{") || variable.includes("}")) return variable;
    return variableSyntax.includes("variable")
      ? variableSyntax.replace("variable", variable)
      : `{{${variable}}}`;
  };

  const copyVariable = async (variable: string) => {
    const token = formatVariable(variable);

    try {
      await navigator.clipboard.writeText(token);
      toast.success(t("notificationTemplates.form.variablesCopied"));
    } catch {
      toast.error(t("notificationTemplates.form.variablesCopyFailed"));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold">
              {isEdit
                ? t("notificationTemplates.editTitle")
                : t("notificationTemplates.createTitle")}
            </h1>

            <p className="text-sm text-muted-foreground">
              {t("notificationTemplates.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Input
            label={t("notificationTemplates.form.name")}
            placeholder={t("notificationTemplates.form.placeholders.name")}
            value={formData.name}
            onChange={(e) => setField("name", e.target.value)}
            required
            error={errors.name}
          />

          <Input
            label={t("notificationTemplates.form.code")}
            placeholder={t("notificationTemplates.form.placeholders.code")}
            disabled={isEdit}
            value={formData.code}
            onChange={(e) => setField("code", e.target.value)}
            required
            error={errors.code}
          />

          <Select
            label={t("notificationTemplates.form.channel")}
            value={formData.channel}
            onChange={(e) => setField("channel", e.target.value)}
            options={channelOptions}
            required
          />

          <Select
            label={t("notificationTemplates.form.module")}
            value={formData.module_type}
            onChange={(e) => setField("module_type", e.target.value)}
            options={moduleOptions}
            required
          />

          <Select
            label={t("notificationTemplates.form.action")}
            value={formData.action_type}
            onChange={(e) => setField("action_type", e.target.value)}
            options={actionOptions}
            required
          />

          <Select
            label={t("notificationTemplates.form.status")}
            value={formData.is_active?.toString()}
            onChange={(e) => setField("is_active", e.target.value === "true")}
            options={[
              {
                label: t("notificationTemplates.status.active"),
                value: "true",
              },
              {
                label: t("notificationTemplates.status.inactive"),
                value: "false",
              },
            ]}
            required
          />
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              {t("notificationTemplates.form.templateSection")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("notificationTemplates.form.templateSectionDescription")}
            </p>
          </div>

          <div className="w-full sm:w-64">
            <Select
              label={t("notificationTemplates.form.language")}
              value={formData.language}
              onChange={(e) => setField("language", e.target.value)}
              options={languageOptions}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">
                {t("notificationTemplates.form.availableVariables")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("notificationTemplates.form.availableVariablesDescription")}
              </p>
            </div>
            <code className="mt-2 inline-flex w-fit rounded-md bg-[hsl(var(--background))] px-2 py-1 text-xs text-muted-foreground sm:mt-0">
              {variableSyntax}
            </code>
          </div>

          <div className="mt-4 space-y-4">
            {isVarsLoading ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-8 rounded-md bg-[hsl(var(--muted))] animate-pulse"
                  />
                ))}
              </div>
            ) : actionVariables.length ? (
              <div className="flex flex-wrap gap-2">
                {actionVariables.map((variable) => {
                  const token = formatVariable(variable);

                  return (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => copyVariable(variable)}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-xs font-mono text-[hsl(var(--foreground))] transition-colors hover:border-primary hover:text-primary"
                      title={t("notificationTemplates.form.copyVariable")}
                    >
                      <span className="truncate">{token}</span>
                      <Copy className="h-3 w-3 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("notificationTemplates.form.noAvailableVariables")}
              </p>
            )}
          </div>
        </div>

        {formData.channel === "email" ? (
          <Input
            dir={formData.language === "ar" ? "rtl" : undefined}
            label={t("notificationTemplates.form.subject")}
            placeholder={subjectPlaceholder}
            value={
              formData.language === "ar"
                ? formData.subject_ar
                : formData.subject_en
            }
            onChange={(e) =>
              setField(
                formData.language === "ar" ? "subject_ar" : "subject_en",
                e.target.value,
              )
            }
          />
        ) : null}

        <div dir={formData.language === "ar" ? "rtl" : undefined}>
          {formData.channel === "email" ? (
            <div className="mb-3">
              <label className="text-sm font-medium">
                {t("notificationTemplates.form.body")}
                <span className="text-[hsl(var(--destructive))] ml-1">*</span>
              </label>
              <RichTextEditor
                placeholder={bodyPlaceholder}
                value={
                  formData.language === "ar"
                    ? formData.body_ar
                    : formData.body_en
                }
                onChange={(value: string) =>
                  setField(
                    formData.language === "ar" ? "body_ar" : "body_en",
                    value,
                  )
                }
                className="flex-1 min-h-72"
              />
              {errors.body_en && (
                <p className="mt-2 text-sm text-[hsl(var(--destructive))]">
                  {errors.body_en}
                </p>
              )}
            </div>
          ) : (
            <div>
              <Textarea
                dir={formData.language === "ar" ? "rtl" : undefined}
                label={t("notificationTemplates.form.body")}
                placeholder={bodyPlaceholder}
                value={
                  formData.language === "ar"
                    ? formData.body_ar
                    : formData.body_en
                }
                onChange={(e) =>
                  setField(
                    formData.language === "ar" ? "body_ar" : "body_en",
                    e.target.value,
                  )
                }
                className="min-h-72"
                required
                error={
                  errors[formData.language === "ar" ? "body_ar" : "body_en"]
                }
              />
              {SMS_MAX_LENGTH > 0 && (
                <div className="flex justify-end mt-1">
                  <span
                    className={`text-xs font-mono ${
                      smsCharCount > SMS_MAX_LENGTH
                        ? "text-red-500 font-semibold"
                        : smsCharCount > SMS_MAX_LENGTH * 0.9
                          ? "text-amber-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {smsCharCount}/{SMS_MAX_LENGTH}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          leftIcon={<Save className="w-4 h-4" />}
          isLoading={mutation.isPending}
          onClick={handleSubmit}
        >
          {isEdit
            ? t("notificationTemplates.form.saveAction")
            : t("notificationTemplates.form.createAction")}
        </Button>
      </div>
    </div>
  );
}
