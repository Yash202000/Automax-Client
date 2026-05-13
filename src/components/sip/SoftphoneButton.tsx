import React from "react";
import { Phone } from "lucide-react";
import { useSoftphoneStore } from "@/stores/softphoneStore";
import { cn } from "@/lib/utils";

interface SoftphoneButtonProps {
  className?: string;
  iconClassName?: string;
}

export const SoftphoneButton: React.FC<SoftphoneButtonProps> = ({
  className,
  iconClassName,
}) => {
  const { isOpen, toggle, isConnected, isConnecting, shouldConnect } =
    useSoftphoneStore();

  const status = isConnected
    ? "connected"
    : isConnecting || (shouldConnect && !isConnected)
      ? "connecting"
      : "disconnected";

  return (
    <div className="relative inline-flex">
      <button
        onClick={toggle}
        className={cn(
          "relative p-2.5 rounded-xl transition-colors focus:outline-none focus:ring-0",
          isOpen
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10",
          className,
        )}
      >
        <Phone className={cn("w-5 h-5", iconClassName)} />
      </button>
      <div
        className={cn(
          "absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-sidebar shadow-sm",
          status === "connected"
            ? "bg-green-500"
            : status === "connecting"
              ? "bg-yellow-500 animate-pulse"
              : "bg-red-500",
        )}
      />
    </div>
  );
};
