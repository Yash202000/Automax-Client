import { useTranslation } from "react-i18next";
import { Modal, ModalBody } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Clock, RefreshCw } from "lucide-react";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  totalWarningSeconds: number;
  onStayLoggedIn: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  totalWarningSeconds,
  onStayLoggedIn,
}) => {
  const { t } = useTranslation();

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `${seconds}`;

  const progress =
    totalWarningSeconds > 0
      ? (remainingSeconds / totalWarningSeconds) * 100
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      closeOnOverlayClick={false}
      showCloseButton={false}
      size="sm"
    >
      <ModalBody className="p-8">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {timeDisplay}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {t("session.timeoutWarning", {
                defaultValue: "Session Expiring Soon",
              })}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              {t("session.timeoutMessage", {
                defaultValue:
                  "Your session will expire due to inactivity. You will be automatically logged out in",
              })}
            </p>
          </div>

          <div className="w-full max-w-[200px]">
            <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mb-1.5">
              <span>
                {t("session.timeRemaining", {
                  defaultValue: "Time remaining",
                })}
              </span>
              <span className="font-mono font-semibold text-[hsl(var(--foreground))]">
                {timeDisplay}
                {minutes === 0 ? "s" : ""}
              </span>
            </div>
            <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Button onClick={onStayLoggedIn} variant="default" className="w-full">
            <RefreshCw className="w-4 h-4" />
            {t("session.stayLoggedIn", {
              defaultValue: "Stay Logged In",
            })}
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};
