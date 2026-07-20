import { Phone } from "lucide-react";

/** A phone/extension rendered as a click-to-dial button. Dispatches the app-wide
 *  `initiate-call` event (the Cintrix CTI widget bridge dials it). Renders a
 *  muted dash when there is no number. */
export default function CallablePhone({
  number,
  className,
  showIcon = true,
}: {
  number?: string | null;
  className?: string;
  showIcon?: boolean;
}) {
  const n = (number ?? "").toString().trim();
  if (!n) return <span className="text-[hsl(var(--muted-foreground))]">—</span>;
  return (
    <button
      type="button"
      title={`Call ${n}`}
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("initiate-call", { detail: { number: n } }),
        );
      }}
      className={
        "text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1 " +
        (className ?? "")
      }
    >
      {showIcon && <Phone className="w-3.5 h-3.5" />}
      <span dir="ltr">{n}</span>
    </button>
  );
}
