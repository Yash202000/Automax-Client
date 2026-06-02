import React from "react";
import { MapPin, MessageSquare, Paperclip } from "lucide-react";
import type { Incident } from "../../types";

interface SMSLegendsProps {
  incident: Incident;
}

export const SMSLegends: React.FC<SMSLegendsProps> = ({ incident }) => {
  // Only show for incidents that sent out SMS to citizen requesting more info.
  // When an incident is created through IVR, source is 'ivr' and once citizen updates, it becomes 'sms-link'.
  const isSMSRequested = incident.source === "ivr" || incident.ivr_submitted;

  if (!isSMSRequested) return null;

  // Check if each item is present (added by citizen)
  // Location: present if coordinates are set or if source is sms-link (since form requires location)
  const hasLocation =
    !!(incident.latitude && incident.longitude) || incident.ivr_submitted;

  // Comment: present if comments_count > 0 or if source is sms-link (since form requires comment)
  const hasComment =
    (incident.comments_count ?? 0) > 0 || incident.ivr_submitted;

  // Attachment: present if attachments_count > 0
  const hasAttachment = incident.ivr_submitted;

  return (
    <div
      className="inline-flex items-center gap-1.5 ml-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Location Icon */}
      <div
        className={`relative p-1 rounded-md border text-xs transition-all ${
          hasLocation
            ? "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50"
            : "text-gray-300 bg-gray-50 border-gray-100 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-700"
        }`}
        title={
          hasLocation
            ? "Location provided by citizen"
            : "No location provided yet"
        }
      >
        <MapPin className="w-3.5 h-3.5" />
      </div>

      {/* Comment Icon */}
      <div
        className={`relative p-1 rounded-md border text-xs transition-all ${
          hasComment
            ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50"
            : "text-gray-300 bg-gray-50 border-gray-100 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-700"
        }`}
        title={
          hasComment ? "Comment provided by citizen" : "No comment provided yet"
        }
      >
        <MessageSquare className="w-3.5 h-3.5" />
      </div>

      {/* Attachment Icon */}
      <div
        className={`relative p-1 rounded-md border text-xs transition-all ${
          hasAttachment
            ? "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/50"
            : "text-gray-300 bg-gray-50 border-gray-100 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-700"
        }`}
        title={
          hasAttachment
            ? "Attachments uploaded by citizen"
            : "No attachments uploaded"
        }
      >
        <Paperclip className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
