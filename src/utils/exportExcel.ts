import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toast } from "sonner";

// Flattens a list of plain objects into an .xlsx download — one row per item,
// one column per key (excluding "id"). Used anywhere a KPI list needs a real
// spreadsheet export rather than just print/PDF.
export async function exportToExcel(
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
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(label);
  worksheet.addRow(headers);
  rows.forEach((row) => {
    worksheet.addRow(row);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${label}.xlsx`);
  toast.success(successMessage);
}
