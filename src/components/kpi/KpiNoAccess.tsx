import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export function KpiNoAccess({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-slate-400">
      <ShieldOff className="w-12 h-12 mb-4 text-amber-500" />
      <p className="text-lg font-medium text-slate-900 dark:text-white">
        You don't have access to this KPI
      </p>
      <p className="mt-2 max-w-md text-sm">
        {message ??
          "Only the KPI's assigned collaborators can open it. Ask the KPI Owner or an administrator to assign you."}
      </p>
      <Link
        to="/goals/kpi/dictionary"
        className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Back to KPI Dictionary
      </Link>
    </div>
  );
}
