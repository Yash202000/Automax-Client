import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Goal } from "../types/goal";

export async function exportGoalsToXlsx(goals: Goal[]) {
  // One row per goal on the "Goals" sheet (matching the All Goals list).
  // Metric details go to a separate "Metrics" sheet, one row per metric,
  // linked by goal ID/title — previously each metric produced its own row
  // on the goals sheet, so a goal with N metrics appeared N times.
  const goalRows: Record<string, string | number>[] = [];
  const metricRows: Record<string, string | number>[] = [];
  const seen = new Set<string>();

  for (const goal of goals) {
    if (seen.has(goal.id)) continue;
    seen.add(goal.id);

    goalRows.push({
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
      Metrics: goal.metrics?.length ?? 0,
    });

    for (const metric of goal.metrics ?? []) {
      metricRows.push({
        "Goal ID": goal.id,
        "Goal Title": goal.title,
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

  const workbook = new ExcelJS.Workbook();
  addSheet(workbook, "Goals", goalRows);
  if (metricRows.length > 0) addSheet(workbook, "Metrics", metricRows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `goals_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: Record<string, string | number>[],
) {
  const worksheet = workbook.addWorksheet(name);
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    worksheet.addRow(headers);
    rows.forEach((row) => {
      worksheet.addRow(headers.map((header) => row[header]));
    });
  }

  // Auto-size columns
  for (let i = 1; i <= worksheet.columnCount; i++) {
    const column = worksheet.getColumn(i);
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value?.toString() ?? "";
      maxLength = Math.max(maxLength, value.length);
    });
    column.width = Math.min(maxLength + 2, 50);
  }
}
