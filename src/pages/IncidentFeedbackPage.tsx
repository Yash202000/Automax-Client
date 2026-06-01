import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  AlertTriangle,
  Send,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Zap,
} from "lucide-react";

import { Button, Card, Textarea } from "@/components/ui";
import { incidentApi } from "@/api/admin";
import IncidentDetailsCard from "@/components/incidents/IncidentDetailsCard";

export const CitizenIncidentFeedbackPage = () => {
  const { incidentId } = useParams<{ incidentId?: string }>();
  const [searchParams] = useSearchParams();
  const signedToken = searchParams.get("signed_token") || "";

  const [satisfaction, setSatisfaction] = useState<
    "satisfied" | "unsatisfied" | null
  >(null);
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validationQuery = useQuery({
    queryKey: ["citizen-feedback-validate", incidentId, signedToken],
    queryFn: () => {
      if (!incidentId || !signedToken) {
        throw new Error("Invalid feedback link");
      }
      return incidentApi.citizenFeedback.validateLink(incidentId, signedToken);
    },
    enabled: !!incidentId && !!signedToken,
    retry: false,
  });

  const validatedIncident = validationQuery?.data?.data;

  const incident = {
    incident_number: validatedIncident?.incident_number,
    description: validatedIncident?.description,
    status: validatedIncident?.status,
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!incidentId || !signedToken) {
        throw new Error("Invalid feedback link");
      }
      return incidentApi.citizenFeedback.submitFeedback(
        incidentId,
        signedToken,
        {
          satisfied: satisfaction === "satisfied",
          comment: feedback.trim(),
        },
      );
    },
    onSuccess: () => setSubmitted(true),
    onError: (error: any) => {
      setErrors({
        submit:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to submit feedback",
      });
    },
  });

  const complaintMutation = useMutation({
    mutationFn: async () => {
      if (!incidentId || !signedToken) {
        throw new Error("Invalid feedback link");
      }
      return incidentApi.citizenFeedback.submitFeedback(
        incidentId,
        signedToken,
        {
          satisfied: false,
          comment: feedback.trim(),
        } as any,
      );
    },
    onSuccess: () => setSubmitted(true),
    onError: (error: any) => {
      setErrors({
        submit:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create complaint",
      });
    },
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!satisfaction)
      e.satisfaction = "Please select satisfied or unsatisfied";
    if (satisfaction === "unsatisfied" && !feedback.trim())
      e.feedback = "Please explain why you're not satisfied";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitFeedback = () => {
    if (!validate()) return;
    submitMutation.mutate();
  };

  const linkErrorMessage =
    !incidentId || !signedToken
      ? "The feedback link is invalid. Please check the URL or contact support."
      : validationQuery.data?.data?.message ||
        "This feedback link is expired or no longer valid. Please contact support for assistance.";

  const isLinkInvalid = !incidentId || !signedToken || validationQuery.isError;

  if (validationQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-600">
          Validating your feedback link...
        </p>
      </div>
    );
  }

  if (isLinkInvalid) {
    return (
      <div className="mx-auto max-w-3xl py-6 px-4">
        <div className="flex items-center p-4 bg-card rounded-3xl mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Automax</span>
          </div>
        </div>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold text-red-900">
            Feedback Link Unavailable
          </h2>
          <p className="mt-3 text-sm text-red-700 max-w-xl mx-auto">
            {linkErrorMessage}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl py-6 px-4">
        <div className="flex items-center p-4 bg-card rounded-3xl mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Automax</span>
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-lg">
            <Zap className="h-10 w-10" />
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
            Feedback Submitted
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Thank you!</h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
            Your feedback has been submitted successfully for incident #
            {incident?.incident_number}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center p-4 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Automax</span>
        </div>
      </div>
      {/* Header */}
      <div className="space-y-6  py-4 px-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Incident Feedback
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Share your experience regarding the closed incident
          </p>
        </div>

        {/* Incident */}
        <IncidentDetailsCard incident={incident} />

        {/* Feedback */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare className="w-5 h-5 text-blue-600" />

            <h2 className="text-base font-semibold text-gray-900">
              Was this helpful?
            </h2>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <Button
              variant={satisfaction === "satisfied" ? "success" : "outline"}
              onClick={() => {
                setSatisfaction("satisfied");
                setErrors((p) => ({ ...p, satisfaction: "" }));
              }}
              leftIcon={<ThumbsUp className="w-4 h-4 " />}
            >
              Satisfied
            </Button>

            <Button
              variant={
                satisfaction === "unsatisfied" ? "destructive" : "outline"
              }
              onClick={() => {
                setSatisfaction("unsatisfied");
                setErrors((p) => ({ ...p, satisfaction: "" }));
              }}
              leftIcon={<ThumbsDown className="w-4 h-4" />}
            >
              Unsatisfied
            </Button>

            {errors.satisfaction && (
              <p className="mt-2 w-full text-sm text-red-500">
                {errors.satisfaction}
              </p>
            )}
          </div>

          {/* Feedback */}
          <Textarea
            label={
              satisfaction === "unsatisfied"
                ? "Reason (required)"
                : "Feedback (optional)"
            }
            placeholder={
              satisfaction === "unsatisfied"
                ? "Please tell us why you're not satisfied..."
                : "Tell us more..."
            }
            rows={5}
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
              if (e.target.value.trim())
                setErrors((p) => ({ ...p, feedback: "" }));
            }}
            required={satisfaction === "unsatisfied"}
            error={errors.feedback}
          />

          {satisfaction === "unsatisfied" && (
            <div className="mt-5 p-4 rounded-xl border border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />

                <div>
                  <h3 className="text-sm font-semibold text-red-700">
                    Not satisfied with the resolution?
                  </h3>

                  <p className="mt-1 text-sm text-red-600 leading-relaxed">
                    Submitting this will create a complaint and our team will
                    review the incident.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {errors.submit && (
            <div className="mt-5 p-3 rounded-lg border border-red-200 bg-red-50">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {satisfaction === "unsatisfied" ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleSubmitFeedback}
                isLoading={complaintMutation.isPending}
              >
                Submit & Create Complaint
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleSubmitFeedback}
                isLoading={submitMutation.isPending}
                leftIcon={<Send className="w-4 h-4" />}
                disabled={!satisfaction}
              >
                Submit Feedback
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
