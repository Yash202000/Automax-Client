import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { Goal } from "../types/goal";

export function exportGoalsToXlsx(goals: Goal[]) {
  const rows: Record<string, string | number>[] = [];

  for (const goal of goals) {
    const baseRow = {
      ID: goal.id,
      Title: goal.title,
      Description: goal.description || "",
      Category: goal.category || "",
      Priority: goal.priority,
      Status: goal.status,
      Owner: goal.owner
        ? `${goal.owner.first_name} ${goal.owner.last_name}`
        : "",
      Department: goal.department?.name || "",
      "Start Date": goal.start_date
        ? new Date(goal.start_date).toLocaleDateString()
        : "",
      "Target Date": goal.target_date
        ? new Date(goal.target_date).toLocaleDateString()
        : "",
      "Review Date": goal.review_date
        ? new Date(goal.review_date).toLocaleDateString()
        : "",
      "Progress (%)": Math.round(goal.progress * 10) / 10,
    };

    if (!goal.metrics || goal.metrics.length === 0) {
      rows.push({
        ...baseRow,
        "Metric Name": "",
        "Metric Type": "",
        Unit: "",
        "Baseline Value": "",
        "Current Value": "",
        "Target Value": "",
        Weight: "",
      });
    } else {
      for (const metric of goal.metrics) {
        rows.push({
          ...baseRow,
          "Metric Name": metric.name,
          "Metric Type": metric.metric_type,
          Unit: metric.unit || "",
          "Baseline Value": metric.baseline_value,
          "Current Value": metric.current_value,
          "Target Value": metric.target_value,
          Weight: metric.weight,
        });
      }
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Goals");

  // Auto-size columns
  const maxWidths: number[] = [];
  const headers = Object.keys(rows[0] || {});
  headers.forEach((h, i) => {
    maxWidths[i] = h.length;
  });
  rows.forEach((row) => {
    headers.forEach((h, i) => {
      const val = String(row[h] ?? "");
      if (val.length > maxWidths[i]) maxWidths[i] = val.length;
    });
  });
  worksheet["!cols"] = maxWidths.map((w) => ({ wch: Math.min(w + 2, 50) }));

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `goals_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
