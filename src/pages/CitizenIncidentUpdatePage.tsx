import React, { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Upload,
  X,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Send,
  MapPin,
} from "lucide-react";
import {
  Button,
  Card,
  Textarea,
  LocationPicker,
  LocationPickerModal,
  type LocationData,
} from "@/components/ui";
import { incidentApi } from "@/api/admin";
import IncidentDetailsCard from "@/components/incidents/IncidentDetailsCard";

export function CitizenIncidentUpdatePage() {
  const { t } = useTranslation();

  // ── Form state ──
  const [location, setLocation] = useState<LocationData | undefined>();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const _location = useLocation();
  const incident = _location.state?.incident;

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "video/mp4",
    "application/pdf",
  ];
  const MAX_MB = 20;

  // ── Submit mutation ──
  const submitMutation = useMutation({
    mutationFn: async ({
      data,
      files,
    }: {
      data: {
        latitude: number;
        longitude: number;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postal_code?: string;
        comment: string;
        version: number;
        source: string;
      };
      files: File[];
    }) => {
      const response = await incidentApi.update(incident.id, data);

      if (files.length > 0) {
        await Promise.all(
          files.map((file) => incidentApi.uploadAttachment(incident.id, file)),
        );
      }

      return response;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        t("citizen.submitError", "Failed to submit update. Please try again.");
      setErrors((prev) => ({ ...prev, submit: message }));
    },
  });

  // ── File handling ──
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const invalid: string[] = [];
    const valid: File[] = [];
    Array.from(files).forEach((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        invalid.push(
          `${f.name} — ${t("citizen.unsupportedType", "unsupported type")}`,
        );
      } else if (f.size > MAX_MB * 1024 * 1024) {
        invalid.push(
          `${f.name} — ${t("citizen.tooLarge", `exceeds ${MAX_MB}MB`)}`,
        );
      } else {
        valid.push(f);
      }
    });
    if (invalid.length) {
      setErrors((p) => ({ ...p, attachments: invalid.join(", ") }));
    } else {
      setErrors((p) => ({ ...p, attachments: "" }));
    }
    setAttachments((p) => [...p, ...valid]);
  };

  const removeFile = (index: number) =>
    setAttachments((p) => p.filter((_, i) => i !== index));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!location) {
      e.location = t(
        "citizen.locationRequired",
        "Please select a location on the map.",
      );
    }
    if (!comment.trim()) {
      e.comment = t(
        "citizen.commentRequired",
        "Please add a comment about the incident.",
      );
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    submitMutation.mutate({
      data: {
        latitude: location!.latitude,
        longitude: location!.longitude,
        address: location?.address,
        city: location?.city,
        state: location?.state,
        country: location?.country,
        postal_code: location?.postal_code,
        comment: comment.trim(),
        version: incident.version,
        source: "sms-link",
      },
      files: attachments,
    });
  };

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-6 py-8">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("citizen.successTitle", "Update submitted")}
          </h2>
          <p className="mt-2 text-gray-600 text-sm leading-relaxed">
            {t(
              "citizen.successBody",
              "Thank you! Your location and details have been saved to incident",
            )}{" "}
            <span className="font-semibold text-blue-600">
              #{incident.incident_number}
            </span>
            .{" "}
            {t(
              "citizen.successNote",
              "Our team has been notified and will follow up as needed.",
            )}
          </p>
        </div>
        <Card className="w-full p-4 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">
                {t("citizen.reference", "Reference")}
              </dt>
              <dd className="font-semibold text-gray-900">
                #{incident.incident_number}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">
                {t("citizen.submittedAt", "Submitted at")}
              </dt>
              <dd className="font-semibold text-gray-900">
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t("citizen.status", "Status")}</dt>
              <dd>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {t("citizen.inProgress", "In Progress")}
                </span>
              </dd>
            </div>
          </dl>
        </Card>
        <p className="text-xs text-gray-400">
          {t("citizen.closePage", "You may safely close this page.")}
        </p>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("citizen.updateTitle", "Add incident details")}
        </h1>
      </div>

      <IncidentDetailsCard incident={incident} />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* ── Location ── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-blue-600" />
            {t("citizen.locationSection", "Incident location")}
            <span className="text-red-500">*</span>
          </h2>

          <LocationPicker
            label={t("incidents.geolocation", "Geolocation")}
            value={location}
            onChange={(loc) => {
              setLocation(loc);
              if (loc) setErrors((p) => ({ ...p, location: "" }));
            }}
            required
            error={errors.location}
            onToggleExpand={() => setShowLocationModal(true)}
          />

          <LocationPickerModal
            isOpen={showLocationModal}
            onClose={() => setShowLocationModal(false)}
            value={location}
            onChange={(loc) => {
              setLocation(loc ?? undefined);
              if (loc) setErrors((p) => ({ ...p, location: "" }));
            }}
          />
        </Card>

        {/* ── Attachments ── */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Paperclip className="w-4 h-4 text-blue-600" />
            {t("incidents.attachments", "Attachments")}
            <span className="text-xs font-normal text-gray-400">
              ({t("common.optional", "optional")})
            </span>
          </h2>

          {attachments.length > 0 && (
            <div className="space-y-2 mb-4">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label
            className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors
              hover:border-blue-400 hover:bg-blue-50
              ${errors.attachments ? "border-red-300 bg-red-50" : "border-gray-300"}
            `}
          >
            <Upload className="w-6 h-6 text-gray-400" />
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium text-blue-600">
                {t("incidents.clickToUpload", "Click to upload")}
              </span>{" "}
              {t("common.orDragAndDrop", "or drag and drop")}
            </p>
            <p className="text-xs text-gray-400">
              JPG, PNG, MP4, PDF &middot; {t("citizen.maxSize", "Max")} {MAX_MB}
              MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.mp4,.pdf"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {errors.attachments && (
            <p className="mt-2 text-sm text-red-500">{errors.attachments}</p>
          )}
        </Card>

        {/* ── Comment ── */}
        <Card className="p-6">
          <Textarea
            label={t("incidents.comment", "Comment")}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (e.target.value.trim()) {
                setErrors((p) => ({ ...p, comment: "" }));
              }
            }}
            placeholder={t(
              "citizen.commentPlaceholder",
              "Describe what happened, any hazards, or anything else that may help our team respond...",
            )}
            rows={4}
            required
            error={errors.comment}
          />
        </Card>

        {/* ── Submit error ── */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{errors.submit}</span>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="space-y-3 pb-8">
          <Button
            type="submit"
            className="w-full"
            leftIcon={<Send className="w-4 h-4" />}
            isLoading={submitMutation.isPending}
          >
            {t("citizen.submitUpdate", "Submit update")}
          </Button>
        </div>
      </form>
    </div>
  );
}
