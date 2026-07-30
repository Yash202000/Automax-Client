import * as XLSX from "xlsx";
import { toast } from "sonner";

// Flattens a list of plain objects into an .xlsx download — one row per item,
// one column per key (excluding "id"). Used anywhere a KPI list needs a real
// spreadsheet export rather than just print/PDF.
export function exportToExcel(
  data: any[],
  label: string,
  noDataMessage = "No data to export",
  successMessage = "Exported",
) {
  if (!data.length) {
    toast.error(noDataMessage);
    return;
  }
  const headers = Object.keys(data[0]).filter((k) => k !== "id");
  const rows = data.map((item) =>
    headers.map((h) => {
      const val = item[h];
      if (
        val !== null &&
        val !== undefined &&
        typeof val === "object" &&
        !Array.isArray(val)
      ) {
        return (
          val.name ??
          Object.values(val)
            .filter((v) => typeof v === "string")
            .join(", ") ??
          ""
        );
      }
      if (Array.isArray(val)) return val.length;
      return val ?? "";
    }),
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, label);
  XLSX.writeFile(wb, `${label}.xlsx`);
  toast.success(successMessage);
}
