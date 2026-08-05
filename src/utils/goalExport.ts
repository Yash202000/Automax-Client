import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Goal } from "../types/goal";

export async function exportGoalsToXlsx(goals: Goal[]) {
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
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Goals");

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

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `goals_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
