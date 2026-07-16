/**
 * Post-call "caller sentiment" collection modal for the Cintrix CTI widget
 * integration. Re-implements the native softphone's sentiment prompt
 * (src/components/sip/Softphone.tsx, ~line 1233) as a standalone component
 * driven by cintrix:call-ended instead of the native SIP call lifecycle —
 * see CintrixCtiHost.tsx for the trigger.
 */
import React, { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Phone, Clock, X } from "lucide-react";
import { callerFeedbackApi } from "@/api/admin";
import { SENTIMENTS } from "../sip/Softphone";

type Sentiment = ReturnType<typeof SENTIMENTS>[number];

interface CallerSentimentModalProps {
  number: string;
  durationSeconds: number;
  callUuid: string;
  onClose: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const CallerSentimentModal: React.FC<CallerSentimentModalProps> = ({
  number,
  durationSeconds,
  callUuid,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(
    null,
  );

  const feedbackMutation = useMutation({
    mutationFn: () => {
      return callerFeedbackApi.create({
        callee_id: number,
        call_uuid: callUuid,
        sentiment: selectedSentiment!.key,
        feedback: selectedSentiment!.label,
      });
    },
    onSuccess: () => {
      toast.success(t("softphone.feedbackSubmitted"));
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (sentiment: Sentiment | null): void => {
    if (!sentiment) {
      onClose();
      return;
    }
    feedbackMutation.mutate();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-[300px] overflow-hidden p-4">
        {/* Sentiment header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-900">
              {t("softphone.sentimentTitle")}
            </p>

            <p className="text-xs text-gray-400 flex items-center gap-2">
              <Phone className="w-3 h-3" />
              <span>{number}</span>
              <Clock className="w-3 h-3" />
              <span>{formatDuration(durationSeconds)}</span>
            </p>
          </div>

          <button
            onClick={() => handleSubmit(null)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Emoji row */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {SENTIMENTS(t).map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedSentiment(item)}
              title={item.label}
              className={`text-2xl leading-none p-2 rounded-xl border transition-all duration-150 ${
                selectedSentiment?.key === item.key
                  ? "scale-110 bg-blue-50 border-primary opacity-100"
                  : "bg-transparent hover:bg-muted border-transparent "
              }`}
            >
              {item.emoji}
            </button>
          ))}
        </div>

        {/* Selected label */}
        <div
          className={`text-center text-xs font-medium text-blue-600 capitalize h-4 mb-4 transition-opacity duration-200 ${
            selectedSentiment ? "opacity-100" : "opacity-0"
          }`}
        >
          {selectedSentiment?.label}
        </div>

        {/* Submit */}
        <button
          onClick={() => handleSubmit(selectedSentiment)}
          disabled={!selectedSentiment}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
            selectedSentiment
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {t("softphone.submit")}
        </button>
      </div>
    </div>
  );
};
