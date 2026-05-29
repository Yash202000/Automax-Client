import { Link } from "react-router-dom";

const RenderWithIncidentMentions: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Match both: @[incidentNumber](incident:incidentId) and @{incidentNumber:incidentId}
  const regex = /@\[([^\]]+)\]\(incident:([^)]+)\)|@\{([^:]+):([^}]+)\}/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const incidentNumber = match[1] || match[3];
    const incidentId = match[2] || match[4];

    if (matchIndex > lastIndex) {
      elements.push(text.substring(lastIndex, matchIndex));
    }

    elements.push(
      <Link
        key={`${incidentId}-${matchIndex}`}
        to={`/incidents/${incidentId}`}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="text-[hsl(var(--primary))] hover:underline font-medium bg-[hsl(var(--primary)/0.1)] px-1 py-0.5 rounded-sm inline-flex items-center gap-0.5"
      >
        {incidentNumber}
      </Link>,
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return <>{elements.length > 0 ? elements : text}</>;
};

export default RenderWithIncidentMentions;
