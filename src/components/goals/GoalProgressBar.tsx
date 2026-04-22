import React from "react";

interface GoalProgressBarProps {
  progress: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<string, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export const GoalProgressBar: React.FC<GoalProgressBarProps> = ({
  progress,
  size = "md",
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ${SIZE_CLASSES[size]}`}
      >
        <div
          className={`${SIZE_CLASSES[size]} rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums min-w-[3rem] ltr:text-right rtl:text-left">
        {Math.round(clampedProgress)}%
      </span>
    </div>
  );
};

export default GoalProgressBar;
