import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { lookupApi } from "../api/admin";
import {
  validateImageFiles,
  type ImageValidationResult,
  type RejectedAttachment,
} from "../utils/imageValidation";

const LOOKUP_CATEGORIES_QUERY_KEY = ["admin", "lookups", "categories"];

/**
 * Validates picked images against the image validation API when the
 * ENV_CONFIGURATION lookup has IMAGE_VALIDATION_REQUIRED = true; otherwise all
 * files are passed through. Tracks the rejected files so the caller can show
 * them with <RejectedAttachmentsList />.
 */
export function useImageValidation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [rejected, setRejected] = useState<RejectedAttachment[]>([]);

  const clearRejected = useCallback(() => setRejected([]), []);

  const validate = useCallback(
    async (files: File[]): Promise<ImageValidationResult> => {
      setRejected([]);
      if (files.length === 0) return { valid: files, rejected: [] };

      setIsValidating(true);
      try {
        // Reuses the cached lookup categories, fetching them if the page
        // hasn't loaded them yet so the flag is never read before it's known.
        const categories = await queryClient
          .ensureQueryData({
            queryKey: LOOKUP_CATEGORIES_QUERY_KEY,
            queryFn: () => lookupApi.listCategories(),
          })
          .catch(() => undefined);
        const flag = categories?.data
          ?.find((cat) => cat.code === "ENV_CONFIGURATION")
          ?.values?.find((v) => v.code === "IMAGE_VALIDATION_REQUIRED")?.name;
        if (flag?.trim().toLowerCase() !== "true") {
          return { valid: files, rejected: [] };
        }

        const result = await validateImageFiles(files, {
          notClear: t(
            "incidents.imageNotClear",
            "This photo is too dark or too bright to show any details. Please take it again in better light.",
          ),
          checkFailed: t(
            "incidents.imageCheckFailed",
            "We couldn't check this photo right now. Please try adding it again.",
          ),
        });
        setRejected(result.rejected);
        if (result.rejected.length > 0) {
          toast.error(
            t("incidents.invalidImagesRemoved", {
              count: result.rejected.length,
              defaultValue:
                "Some photos weren't added because they aren't clear enough. Please upload clearer photos.",
            }),
          );
        }
        return result;
      } finally {
        setIsValidating(false);
      }
    },
    [queryClient, t],
  );

  return { validate, isValidating, rejected, clearRejected };
}
