import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui";
import { incidentApi } from "../api/admin";
import type {
  PublicIncidentFeedbackRequest,
  PublicIncidentFeedbackValidationResponse,
} from "../types";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const IncidentFeedbackPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [incident, setIncident] = useState<
    PublicIncidentFeedbackValidationResponse["incident"] | null
  >(null);
  const [pageState, setPageState] = useState<
    | "loading"
    | "ready"
    | "invalid"
    | "expired"
    | "submitting"
    | "success"
    | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState("");

  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      setErrorMessage("Invalid access link.");
      return;
    }

    const validateLink = async () => {
      setPageState("loading");
      setErrorMessage(null);
      try {
        const response = await incidentApi.publicFeedback.validateLink(token);
        if (!response.success) {
          const message = response.error || response.data?.message;
          if (message?.toLowerCase().includes("expire")) {
            setPageState("expired");
          } else {
            setPageState("invalid");
          }
          setErrorMessage(message || "Invalid or expired feedback link.");
          return;
        }

        if (!response.data?.valid) {
          if (response?.data?.message?.toLowerCase().includes("expire")) {
            setPageState("expired");
          } else {
            setPageState("invalid");
          }
          setErrorMessage(
            response.data?.message || "Invalid or expired feedback link.",
          );
          return;
        }

        setIncident(response.data.incident);
        setPageState("ready");
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to validate feedback link.";
        if (message.toLowerCase().includes("expire")) {
          setPageState("expired");
        } else {
          setPageState("invalid");
        }
        setErrorMessage(message);
      }
    };

    validateLink();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setPageState("invalid");
      setErrorMessage("Invalid access link.");
      return;
    }

    if (!comment.trim()) {
      setErrorMessage("Please provide feedback before submitting.");
      return;
    }

    setPageState("submitting");
    setErrorMessage(null);

    const payload: PublicIncidentFeedbackRequest = {
      comment: comment.trim(),
      rating: rating ? Number(rating) : undefined,
    };

    try {
      const response = await incidentApi.publicFeedback.submitFeedback(
        token,
        payload,
      );

      if (!response.success) {
        throw new Error(
          response.error ||
            response.data?.message ||
            "Unable to submit feedback.",
        );
      }

      setPageState("success");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit feedback. Please try again.";
      setErrorMessage(message);
      setPageState("error");
    }
  };

  const isLoading = pageState === "loading";
  const isFormDisabled = pageState !== "ready";
  const isSubmitting = pageState === "submitting";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Incident feedback
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Share feedback without signing in
            </h1>
          </div>
          <Link
            to="/"
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to home
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center text-slate-500">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-slate-400" />
            <p className="mt-4 text-base font-medium">
              Validating your feedback link…
            </p>
          </div>
        ) : null}

        {(pageState === "invalid" || pageState === "expired") && (
          <div className="mt-10 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-12 text-center text-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-xl font-semibold">
              {pageState === "expired" ? "Link Expired" : "Invalid Access"}
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm leading-6 text-slate-600">
              {errorMessage ||
                "This feedback link is no longer valid. Please contact the incident owner for a new secure link."}
            </p>
          </div>
        )}

        {pageState === "success" && (
          <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center text-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Feedback submitted</h2>
            <p className="mt-3 max-w-xl mx-auto text-sm leading-6 text-slate-600">
              Thank you for your response. Your feedback has been received
              securely.
            </p>
          </div>
        )}

        {incident && pageState === "ready" && (
          <div className="mt-10 space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Incident details
                  </p>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">
                    {incident.title}
                  </h2>
                </div>
                <p className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                  {incident.severity || incident.status || "Status unknown"}
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Incident ID
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {incident.id}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Reported by
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {incident.reported_by || "Unknown"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Date / time
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {formatDateTime(incident.created_at)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {incident.status || "Not available"}
                  </p>
                </div>
              </div>

              {incident.summary ? (
                <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm shadow-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {incident.summary}
                  </p>
                </div>
              ) : null}
            </section>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label
                  htmlFor="feedback-comment"
                  className="text-sm font-medium text-slate-900"
                >
                  Feedback / comments
                </label>
                <textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={6}
                  required
                  aria-required="true"
                  placeholder="Share your experience or report any issues..."
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="feedback-rating"
                    className="text-sm font-medium text-slate-900"
                  >
                    Rating (optional)
                  </label>
                  <select
                    id="feedback-rating"
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">No rating</option>
                    <option value="5">5 — Excellent</option>
                    <option value="4">4 — Good</option>
                    <option value="3">3 — Okay</option>
                    <option value="2">2 — Poor</option>
                    <option value="1">1 — Very poor</option>
                  </select>
                </div>
              </div>

              {errorMessage ? (
                <div
                  className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                  role="alert"
                >
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  disabled={isFormDisabled}
                  isLoading={isSubmitting}
                  fullWidth
                >
                  Submit feedback
                </Button>
              </div>
            </form>
          </div>
        )}

        {pageState === "error" && incident && (
          <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-slate-900">
            <p className="text-base font-semibold">Unable to submit feedback</p>
            <p className="mt-2 text-sm text-slate-600">
              {errorMessage ||
                "Please try again or use the secure link again later."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
