import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ATTACHMENT_CONFIG_QUERY_KEY,
  attachmentConfigApi,
  type AttachmentAudience,
} from "../api/attachmentConfig";
import {
  formatFileSizeMB,
  getFileExtension,
  isExtensionAllowed,
  toAttachmentPolicy,
} from "../utils/attachmentPolicy";
import type { RejectedAttachment } from "../utils/imageValidation";
import { contentMatchesExtension } from "../utils/fileSignature";

export interface AttachmentCheckResult {
  accepted: File[];
  rejected: RejectedAttachment[];
}

/**
 * Attachment rules (enabled, size, count, file types) for citizens or internal
 * users, as configured under System Settings → Attachments.
 *
 * `filterFiles` returns the allowed files and keeps the rejected ones (with a
 * reason) in `rejected`, ready for <PolicyRejectedList />.
 */
export function useAttachmentPolicy(audience: AttachmentAudience) {
  const { t } = useTranslation();
  const [rejected, setRejected] = useState<RejectedAttachment[]>([]);

  // Refetched on every mount so admin changes apply without a reload.
  const { data: config, isPending: isLoadingRules } = useQuery({
    queryKey: ATTACHMENT_CONFIG_QUERY_KEY,
    queryFn: attachmentConfigApi.get,
    staleTime: 0,
  });

  const policy = useMemo(
    () => toAttachmentPolicy(audience, config?.value?.[audience]),
    [audience, config],
  );

  const allowedList = policy.extensions?.map((ext) => `.${ext}`).join(", ");

  /** Splits picked files into accepted ones and rejected ones with a reason. */
  const check = useCallback(
    async (
      files: File[],
      existingCount: number,
    ): Promise<AttachmentCheckResult> => {
      const accepted: File[] = [];
      const rejectedFiles: RejectedAttachment[] = [];
      let remaining = policy.maxFiles - existingCount;

      const getReason = async (file: File) => {
        // Don't fall back to permissive defaults before the rules arrive.
        if (isLoadingRules) {
          return t(
            "attachments.rulesLoading",
            "Attachment rules are still loading. Please try again in a moment.",
          );
        }
        if (!policy.enabled) {
          return t(
            "attachments.disabled",
            "Attachments are currently disabled.",
          );
        }
        if (!isExtensionAllowed(file.name, policy)) {
          return allowedList
            ? t("attachments.typeNotAllowedWithList", {
                allowed: allowedList,
                defaultValue:
                  "This file type is not allowed. Allowed types: {{allowed}}",
              })
            : t("attachments.typeNotAllowed", "This file type is not allowed.");
        }
        // Catches renamed files, e.g. an .exe saved as .pdf.
        if (
          !(await contentMatchesExtension(file, getFileExtension(file.name)))
        ) {
          return t(
            "attachments.contentMismatch",
            "The file content does not match its extension. This file cannot be uploaded.",
          );
        }
        if (file.size > policy.maxSizeMB * 1024 * 1024) {
          return t("attachments.tooLarge", {
            size: formatFileSizeMB(file.size),
            max: policy.maxSizeMB,
            defaultValue: "File is {{size}} MB, the limit is {{max}} MB.",
          });
        }
        if (remaining <= 0) {
          return t("attachments.limitReached", {
            max: policy.maxFiles,
            defaultValue: "Only {{max}} attachments are allowed.",
          });
        }
        return null;
      };

      for (const file of files) {
        const reason = await getReason(file);
        if (reason) {
          rejectedFiles.push({ name: file.name, reason });
        } else {
          accepted.push(file);
          remaining--;
        }
      }
      return { accepted, rejected: rejectedFiles };
    },
    [allowedList, isLoadingRules, policy, t],
  );

  /** Like `check`, but also records the rejected files in `rejected`. */
  const filterFiles = useCallback(
    async (files: File[], existingCount = 0) => {
      const result = await check(files, existingCount);
      setRejected(result.rejected);
      return result.accepted;
    },
    [check],
  );

  const clearRejected = useCallback(() => setRejected([]), []);
  const dismissRejected = useCallback(
    (index: number) =>
      setRejected((prev) => prev.filter((_, i) => i !== index)),
    [],
  );

  const accept = policy.extensions?.map((ext) => `.${ext}`).join(",");

  // "Allowed: JPG, PNG, PDF" (empty when any non-blocked type is allowed)
  const allowedHint = policy.extensions
    ? t("attachments.hintAllowed", {
        types: policy.extensions.map((ext) => ext.toUpperCase()).join(", "),
        defaultValue: "Allowed: {{types}}",
      })
    : "";

  // "Max 5 files · Max 5 MB each"
  const limitsHint = [
    t("attachments.hintCount", {
      max: policy.maxFiles,
      defaultValue: "Max {{max}} files",
    }),
    t("attachments.hintSize", {
      max: policy.maxSizeMB,
      defaultValue: "Max {{max}} MB each",
    }),
  ].join(" · ");

  const hint = [allowedHint, limitsHint].filter(Boolean).join(" · ");

  return {
    ...policy,
    accept,
    hint,
    allowedHint,
    limitsHint,
    check,
    filterFiles,
    rejected,
    clearRejected,
    dismissRejected,
  };
}
