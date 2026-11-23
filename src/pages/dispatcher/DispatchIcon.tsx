import React from "react";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { iconApi } from "../../api/dispatcher";

/** The icon id is the last segment of the stored path (e.g. `icons/truck.svg`). */
const iconIdFromPath = (path: string) => path.split("/").pop() ?? path;

/**
 * Shows a stored dispatch icon. Icons are served behind the bearer token, so
 * the file is downloaded and displayed from an object URL.
 */
export const DispatchIcon: React.FC<{
  path?: string | null;
  fallback: LucideIcon;
  className?: string;
}> = ({ path, fallback: Fallback, className = "w-8 h-8" }) => {
  const isInline = !!path && /^(data:|blob:|https?:)/.test(path);
  const { data: url } = useQuery({
    queryKey: ["dispatch", "icon", path],
    queryFn: async () =>
      URL.createObjectURL(await iconApi.download(iconIdFromPath(path!))),
    enabled: !!path && !isInline,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const src = isInline ? path! : url;

  return src ? (
    <img src={src} alt="" className={`${className} object-contain`} />
  ) : (
    <div
      className={`${className} rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center`}
    >
      <Fallback className="w-1/2 h-1/2 text-[hsl(var(--muted-foreground))]" />
    </div>
  );
};
