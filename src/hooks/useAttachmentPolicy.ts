import { useCallback, useMemo } from "react";
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

export interface AttachmentCheckResult {
  accepted: File[];
  rejected: RejectedAttachment[];
}

/**
 * Attachment rules (enabled, size, count, file types) for citizens or internal
 * users, as configured under System Settings → Attachments.
 */
export function useAttachmentPolicy(audience: AttachmentAudience) {
  const { t } = useTranslation();

  const { data: config } = useQuery({
    queryKey: ATTACHMENT_CONFIG_QUERY_KEY,
    queryFn: attachmentConfigApi.get,
    staleTime: 5 * 60 * 1000,
  });

  const policy = useMemo(
    () => toAttachmentPolicy(audience, config?.value?.[audience]),
    [audience, config],
  );

  /** Splits picked files into accepted ones and rejected ones with a reason. */
  const check = useCallback(
    (files: File[], existingCount: number): AttachmentCheckResult => {
      const accepted: File[] = [];
      const rejected: RejectedAttachment[] = [];
      let remaining = policy.maxFiles - existingCount;

      const getReason = (file: File) => {
        if (!policy.enabled) {
          return t(
            "attachments.disabled",
            "Attachments are currently disabled.",
          );
        }
        if (!isExtensionAllowed(file.name, policy)) {
          return t("attachments.typeNotAllowed", {
            ext: getFileExtension(file.name) || "?",
            defaultValue: ".{{ext}} files are not allowed.",
          });
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
        const reason = getReason(file);
        if (reason) {
          rejected.push({ name: file.name, reason });
        } else {
          accepted.push(file);
          remaining--;
        }
      }
      return { accepted, rejected };
    },
    [policy, t],
  );

  const accept = policy.extensions?.map((ext) => `.${ext}`).join(",");

  const hint = [
    t("attachments.hintSize", {
      max: policy.maxSizeMB,
      defaultValue: "Up to {{max}} MB each",
    }),
    t("attachments.hintCount", {
      max: policy.maxFiles,
      defaultValue: "Max {{max}} files",
    }),
    policy.extensions?.map((ext) => ext.toUpperCase()).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return { ...policy, accept, hint, check };
}
