import { useMemo, useState } from "react";
import {
  BarChart3,
  Banknote,
  CalendarCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  FlaskConical,
  Loader2,
  PackageCheck,
  Pill,
  Printer,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "../../contexts/useAuth";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import patientService from "../../api/services/patientService";
import appointmentService from "../../api/services/appointmentService";
import prescriptionService from "../../api/services/prescriptionService";
import labService from "../../api/services/labService";
import billingService from "../../api/services/billingService";
import medicineService from "../../api/services/medicineService";
import supplierService from "../../api/services/supplierService";
import stockInService from "../../api/services/stockInService";
import userService from "../../api/services/userService";

const FORMAT_OPTIONS = ["PDF", "Excel", "CSV"];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "clinical", label: "Clinical" },
  { value: "appointments", label: "Appointments" },
  { value: "financial", label: "Financial" },
  { value: "inventory", label: "Inventory" },
  { value: "lab", label: "Lab" },
  { value: "admin", label: "Admin" },
];

const REPORTS = [
  {
    title: "Executive Operations Summary",
    description: "High-level patient, appointment, billing, lab, and stock performance.",
    category: "admin",
    icon: BarChart3,
    roles: ["admin"],
    fields: ["Active patients", "Revenue", "Pending lab tests", "Stock alerts"],
    cadence: "Daily",
  },
  {
    title: "Patient Registry Report",
    description: "Patient demographics, status, contact details, and registration trends.",
    category: "clinical",
    icon: Users,
    roles: ["admin", "doctor", "lab", "user"],
    fields: ["Patient ID", "Name", "Age", "Contact", "Status"],
    cadence: "Weekly",
  },
  {
    title: "Appointment Utilization Report",
    description: "Scheduled, completed, cancelled, and no-show appointment activity.",
    category: "appointments",
    icon: CalendarCheck,
    roles: ["admin", "doctor", "user"],
    fields: ["Date", "Doctor", "Patient", "Status", "Reason"],
    cadence: "Daily",
  },
  {
    title: "Doctor Workload Report",
    description: "Doctor-wise appointment volume, prescriptions, and follow-up workload.",
    category: "clinical",
    icon: ClipboardList,
    roles: ["admin", "doctor"],
    fields: ["Doctor", "Appointments", "Prescriptions", "Follow-ups"],
    cadence: "Weekly",
  },
  {
    title: "Prescription Summary Report",
    description: "Prescription counts, medicine usage, and patient prescription history.",
    category: "clinical",
    icon: Pill,
    roles: ["admin", "doctor"],
    fields: ["Prescription ID", "Patient", "Doctor", "Medicine count", "Date"],
    cadence: "Daily",
  },
  {
    title: "Lab Request Status Report",
    description: "Pending, completed, and today lab request workload by test type.",
    category: "lab",
    icon: FlaskConical,
    roles: ["admin", "lab"],
    fields: ["Request ID", "Patient", "Test", "Status", "Requested date"],
    cadence: "Daily",
  },
  {
    title: "Lab Turnaround Report",
    description: "Track lab completion timing and pending workload by priority.",
    category: "lab",
    icon: FlaskConical,
    roles: ["admin", "lab"],
    fields: ["Test", "Requested", "Completed", "Duration", "Status"],
    cadence: "Weekly",
  },
  {
    title: "Billing Collection Report",
    description: "Paid, unpaid, and outstanding billing totals with patient details.",
    category: "financial",
    icon: Banknote,
    roles: ["admin", "user"],
    fields: ["Bill ID", "Patient", "Total", "Paid", "Outstanding"],
    cadence: "Daily",
  },
  {
    title: "Inventory Stock Report",
    description: "Current medicine quantity, stock status, category, and reorder pressure.",
    category: "inventory",
    icon: PackageCheck,
    roles: ["admin", "user"],
    fields: ["Medicine", "Category", "Quantity", "Low stock", "Status"],
    cadence: "Daily",
  },
  {
    title: "Purchase & Supplier Report",
    description: "Supplier activity, purchase orders, pending receipts, and stock-in flow.",
    category: "inventory",
    icon: FileSpreadsheet,
    roles: ["admin", "user"],
    fields: ["PO ID", "Supplier", "Status", "Ordered", "Received"],
    cadence: "Weekly",
  },
  {
    title: "User Access Report",
    description: "System user list, roles, active status, and access review support.",
    category: "admin",
    icon: ShieldCheck,
    roles: ["admin"],
    fields: ["User", "Role", "Status", "Created", "Last updated"],
    cadence: "Monthly",
  },
];

const ROLE_COPY = {
  admin: "Full reporting access across clinical, finance, inventory, lab, and user administration.",
  doctor: "Clinical reports focused on patients, appointments, prescriptions, and workload.",
  lab: "Lab reports focused on requests, completion status, and turnaround performance.",
  user: "Operational reports focused on appointments, billing, inventory, and patient lists.",
};

const PERIOD_LABELS = {
  today: "Today",
  last7: "Last 7 days",
  last30: "Last 30 days",
  month: "This month",
  all: "All time",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileName(value, extension) {
  return `${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function dataList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function valueOrDash(value) {
  return value == null || value === "" ? "-" : value;
}

function fullName(...parts) {
  return parts.filter(Boolean).join(" ").trim();
}

function patientName(record) {
  return (
    record?.patientName ||
    fullName(record?.patientFirstName, record?.patientLastName) ||
    fullName(record?.patient?.firstName, record?.patient?.lastName) ||
    fullName(record?.firstName, record?.lastName) ||
    (record?.patientId ? `Patient #${record.patientId}` : "-")
  );
}

function doctorName(record, doctors = []) {
  const doctorId =
    record?.doctorId ??
    record?.doctor_id ??
    record?.doctor?.doctorId ??
    record?.doctor?.doctor_id;
  const doctor = doctors.find(
    (item) => Number(item.doctorId ?? item.doctor_id) === Number(doctorId),
  );
  return (
    record?.doctorName ||
    record?.doctor_name ||
    fullName(record?.doctorFirstName, record?.doctorLastName) ||
    fullName(record?.doctor_first_name, record?.doctor_last_name) ||
    fullName(record?.doctor?.firstName, record?.doctor?.lastName) ||
    fullName(record?.doctor?.first_name, record?.doctor?.last_name) ||
    fullName(doctor?.firstName, doctor?.lastName) ||
    fullName(doctor?.first_name, doctor?.last_name) ||
    (doctorId ? `Doctor #${doctorId}` : "-")
  );
}

function supplierName(record, suppliers = []) {
  const supplierId =
    record?.supplierId ??
    record?.supplier_id ??
    record?.supplier?.supplierId ??
    record?.supplier?.supplier_id;
  const supplier = suppliers.find(
    (item) => Number(item.supplierId ?? item.supplier_id) === Number(supplierId),
  );

  return (
    record?.supplierName ||
    record?.supplier_name ||
    record?.supplier?.name ||
    record?.supplier?.supplierName ||
    supplier?.name ||
    supplier?.supplierName ||
    record?.name ||
    (supplierId ? `Supplier #${supplierId}` : "-")
  );
}

function appointmentReason(record) {
  return (
    record?.reason ||
    record?.appointment?.reason ||
    record?.notes ||
    "-"
  );
}

function itemCount(record) {
  return valueOrDash(record?.itemCount ?? record?.items?.length ?? 0);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function moneyValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Rs. 0";
  return `Rs. ${number.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function periodFilters(period) {
  if (period === "all") return {};
  const today = new Date();
  const start = new Date(today);

  if (period === "today") {
    return {
      dateFrom: today.toISOString().slice(0, 10),
      dateTo: today.toISOString().slice(0, 10),
    };
  }

  if (period === "last7") start.setDate(today.getDate() - 6);
  if (period === "last30") start.setDate(today.getDate() - 29);
  if (period === "month") start.setDate(1);

  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
  };
}

function emptyRows(report) {
  return [[`No ${report.title.toLowerCase()} records found`, ...report.fields.slice(1).map(() => "-")]];
}

function mapReportRows(report, payload) {
  const list = dataList(payload);

  switch (report.title) {
    case "Executive Operations Summary": {
      const stats = payload ?? {};
      return [
        ["Active patients", valueOrDash(stats.patient?.active), "-", "-"],
        ["Revenue", moneyValue(stats.billing?.totalAmount), moneyValue(stats.billing?.paidAmount), moneyValue(stats.billing?.unpaidAmount)],
        ["Pending lab tests", valueOrDash(stats.lab?.pendingRequests), valueOrDash(stats.lab?.todayRequests), valueOrDash(stats.lab?.completedRequests)],
        ["Stock alerts", valueOrDash(stats.medicine?.lowStock), valueOrDash(stats.medicine?.outOfStock), valueOrDash(stats.medicine?.total)],
      ];
    }
    case "Patient Registry Report":
      return list.map((patient) => [
        valueOrDash(patient.patientId),
        patientName(patient),
        valueOrDash(patient.age ?? patient.dateOfBirth),
        valueOrDash(patient.phone ?? patient.contactNo ?? patient.email),
        patient.isActive === false ? "Inactive" : "Active",
      ]);
    case "Appointment Utilization Report": {
      const appointments = dataList(payload?.appointments ?? payload);
      const doctors = dataList(payload?.doctors);
      return appointments.map((appt) => [
        formatDate(appt.appointmentDate),
        doctorName(appt, doctors),
        patientName(appt),
        valueOrDash(appt.status),
        appointmentReason(appt),
      ]);
    }
    case "Doctor Workload Report": {
      const appointments = dataList(payload?.appointments);
      const prescriptions = dataList(payload?.prescriptions);
      const doctors = dataList(payload?.doctors);
      const doctorIds = [
        ...new Set(
          [...appointments, ...prescriptions]
            .map((item) => item.doctorId ?? item.doctor?.doctorId)
            .filter(Boolean)
            .map(Number),
        ),
      ];

      return doctorIds.map((doctorId) => {
        const sample =
          appointments.find((item) => Number(item.doctorId) === doctorId) ||
          prescriptions.find((item) => Number(item.doctorId ?? item.doctor?.doctorId) === doctorId) ||
          { doctorId };
        const apptCount = appointments.filter(
          (item) => Number(item.doctorId) === doctorId,
        ).length;
        const rxCount = prescriptions.filter(
          (item) => Number(item.doctorId ?? item.doctor?.doctorId) === doctorId,
        ).length;
        const followUps = appointments.filter(
          (item) =>
            Number(item.doctorId) === doctorId &&
            String(item.status ?? "").toLowerCase() === "scheduled",
        ).length;

        return [doctorName(sample, doctors), apptCount, rxCount, followUps];
      });
    }
    case "Prescription Summary Report": {
      const prescriptions = dataList(payload?.prescriptions ?? payload);
      const doctors = dataList(payload?.doctors);
      return prescriptions.map((rx) => [
        valueOrDash(rx.prescriptionId),
        patientName(rx),
        doctorName(rx, doctors),
        itemCount(rx),
        formatDate(rx.issuedDate ?? rx.createdAt ?? rx.prescriptionDate),
      ]);
    }
    case "Lab Request Status Report":
      return list.map((request) => [
        valueOrDash(request.requestId),
        valueOrDash(request.patientName ?? fullName(request.patient?.firstName, request.patient?.lastName)),
        valueOrDash(request.testName ?? request.test?.testName ?? request.labTestName),
        valueOrDash(request.status),
        formatDate(request.requestedDate ?? request.createdAt),
      ]);
    case "Lab Turnaround Report":
      return list.map((request) => [
        valueOrDash(request.testName ?? request.test?.testName ?? request.labTestName),
        formatDate(request.requestedDate ?? request.createdAt),
        formatDate(request.completedDate ?? request.updatedAt),
        valueOrDash(request.turnaroundTime ?? "-"),
        valueOrDash(request.status),
      ]);
    case "Billing Collection Report":
      return list.map((bill) => [
        valueOrDash(bill.billId),
        valueOrDash(bill.patientName ?? fullName(bill.patient?.firstName, bill.patient?.lastName)),
        moneyValue(bill.totalAmount),
        moneyValue(bill.paidAmount),
        moneyValue(bill.balanceAmount ?? bill.outstandingAmount ?? Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0)),
      ]);
    case "Inventory Stock Report":
      return list.map((medicine) => {
        const qty = medicine.stock?.totalQuantity ?? medicine.totalQuantity ?? medicine.quantity ?? 0;
        return [
          valueOrDash(medicine.name),
          valueOrDash(medicine.category),
          valueOrDash(qty),
          Number(qty) <= Number(medicine.reorderLevel ?? medicine.minStockLevel ?? 0) ? "Yes" : "No",
          Number(qty) <= 0 ? "Out of stock" : "Available",
        ];
      });
    case "Purchase & Supplier Report":
      {
        const purchaseOrders = dataList(payload?.purchaseOrders ?? payload);
        const suppliers = dataList(payload?.suppliers);
        return purchaseOrders.map((po) => [
        valueOrDash(po.poId ?? po.supplierId),
        supplierName(po, suppliers),
        valueOrDash(po.status ?? (po.isActive === false ? "Inactive" : "Active")),
        formatDate(po.orderDate ?? po.createdAt),
        formatDate(po.receivedDate ?? po.updatedAt),
        ]);
      }
    case "User Access Report":
      return list.map((user) => [
        valueOrDash(user.username ?? fullName(user.firstName, user.lastName)),
        valueOrDash(user.roleName ?? user.role?.name),
        user.isActive === false ? "Inactive" : "Active",
        formatDate(user.createdAt),
        formatDate(user.updatedAt),
      ]);
    default:
      return [];
  }
}

function reportRows(report, payload) {
  const rows = mapReportRows(report, payload);
  return rows.length > 0 ? rows : emptyRows(report);
}

async function fetchReportPayload(report, period, role, user) {
  const doctorFilter = role === "doctor" && user?.doctorId ? { doctorId: user.doctorId } : {};
  const appointmentFilters = { ...periodFilters(period), ...doctorFilter };

  switch (report.title) {
    case "Executive Operations Summary": {
      const [patient, appointment, medicine, lab, billing] = await Promise.all([
        patientService.getStats(),
        appointmentService.getStats(),
        medicineService.getStats(),
        labService.getStats(),
        billingService.getStats(),
      ]);
      return { patient, appointment, medicine, lab, billing };
    }
    case "Patient Registry Report":
      return patientService.getAll(1, 100);
    case "Appointment Utilization Report": {
      const [appointments, doctors] = await Promise.allSettled([
        appointmentService.getAll(1, 100, appointmentFilters),
        labService.getDoctors(),
      ]);
      return {
        appointments: appointments.status === "fulfilled" ? appointments.value : [],
        doctors: doctors.status === "fulfilled" ? doctors.value : [],
      };
    }
    case "Doctor Workload Report": {
      const [appointments, prescriptions, doctors] = await Promise.allSettled([
        appointmentService.getAll(1, 100, appointmentFilters),
        prescriptionService.getAll(1, 100, doctorFilter),
        labService.getDoctors(),
      ]);
      return {
        appointments: appointments.status === "fulfilled" ? appointments.value : [],
        prescriptions: prescriptions.status === "fulfilled" ? prescriptions.value : [],
        doctors: doctors.status === "fulfilled" ? doctors.value : [],
      };
    }
    case "Prescription Summary Report":
      {
        const [prescriptions, doctors] = await Promise.allSettled([
          prescriptionService.getAll(1, 100, doctorFilter),
          labService.getDoctors(),
        ]);
        return {
          prescriptions:
            prescriptions.status === "fulfilled" ? prescriptions.value : [],
          doctors: doctors.status === "fulfilled" ? doctors.value : [],
        };
      }
    case "Lab Request Status Report":
    case "Lab Turnaround Report":
      return labService.getRequests(1, 100);
    case "Billing Collection Report":
      return billingService.getAll(1, 100);
    case "Inventory Stock Report":
      return medicineService.getAll(1, 100);
    case "Purchase & Supplier Report": {
      const [stockIn, suppliers] = await Promise.allSettled([
        stockInService.getAll({ page: 1, limit: 100 }),
        supplierService.getAll(1, 100),
      ]);
      return {
        purchaseOrders:
          stockIn.status === "fulfilled" && dataList(stockIn.value).length
            ? stockIn.value
            : suppliers.status === "fulfilled"
              ? suppliers.value
              : [],
        suppliers: suppliers.status === "fulfilled" ? suppliers.value : [],
      };
    }
    case "User Access Report":
      return userService.getAll(1, 100);
    default:
      return [];
  }
}

function buildReportHtml(report, period, format, payload) {
  const rows = reportRows(report, payload);
  const generatedAt = new Date().toLocaleString();
  const headerCells = report.fields
    .map((field) => `<th>${escapeHtml(field)}</th>`)
    .join("");
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
    .header { border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { color: #16a34a; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 6px 0; font-size: 24px; }
    .meta { color: #64748b; font-size: 12px; line-height: 1.6; }
    .summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f1f5f9; color: #334155; text-align: left; }
    th, td { border: 1px solid #e2e8f0; padding: 9px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .actions { margin: 20px 0; }
    button { background: #16a34a; color: white; border: 0; border-radius: 6px; padding: 10px 14px; cursor: pointer; }
    @media print {
      body { margin: 18mm; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">SHIIS Report</div>
    <h1>${escapeHtml(report.title)}</h1>
    <div class="meta">
      Period: ${escapeHtml(PERIOD_LABELS[period] ?? period)}<br />
      Format: ${escapeHtml(format)}<br />
      Generated: ${escapeHtml(generatedAt)}
    </div>
  </div>
  <div class="summary">
    <strong>Purpose:</strong> ${escapeHtml(report.description)}<br />
    <strong>Category:</strong> ${escapeHtml(report.category)}<br />
    <strong>Recommended cadence:</strong> ${escapeHtml(report.cadence)}
  </div>
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

function downloadBlob(content, name, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapePdf(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function truncatePdfText(value, maxLength) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function pdfText(x, y, text, size = 10, color = "0.15 0.18 0.24") {
  return [
    "BT",
    `${color} rg`,
    `/F1 ${size} Tf`,
    `${x} ${y} Td`,
    `(${escapePdf(text)}) Tj`,
    "ET",
  ].join("\n");
}

function pdfRect(x, y, width, height, color) {
  return `${color} rg\n${x} ${y} ${width} ${height} re\nf`;
}

function buildSimplePdf(report, period, payload) {
  const rows = reportRows(report, payload);
  const pageWidth = 612;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const tableWidth = contentWidth;
  const columnWidth = tableWidth / report.fields.length;
  const generatedAt = new Date().toLocaleString();
  const periodLabel = PERIOD_LABELS[period] ?? period;
  const commands = [];

  commands.push(pdfRect(0, 742, 612, 100, "0.06 0.10 0.16"));
  commands.push(pdfRect(0, 742, 8, 100, "0.09 0.64 0.29"));
  commands.push(pdfText(42, 800, "SHIIS HEALTHCARE INTELLIGENCE", 9, "0.70 0.88 0.75"));
  commands.push(pdfText(42, 774, truncatePdfText(report.title, 58), 22, "1 1 1"));
  commands.push(pdfText(42, 754, truncatePdfText(report.description, 88), 10, "0.82 0.88 0.95"));
  commands.push(pdfText(470, 800, "REPORT", 12, "1 1 1"));
  commands.push(pdfText(470, 780, report.cadence, 10, "0.82 0.88 0.95"));

  const cardY = 674;
  const cardWidth = 162;
  [
    ["Period", periodLabel],
    ["Category", report.category.toUpperCase()],
    ["Generated", generatedAt],
  ].forEach(([label, value], index) => {
    const x = margin + index * (cardWidth + 15);
    commands.push(pdfRect(x, cardY, cardWidth, 48, "0.96 0.98 1"));
    commands.push(`0.88 0.91 0.95 RG\n${x} ${cardY} ${cardWidth} 48 re\nS`);
    commands.push(pdfText(x + 12, cardY + 29, label, 8, "0.39 0.45 0.55"));
    commands.push(pdfText(x + 12, cardY + 12, truncatePdfText(value, 26), 11, "0.08 0.10 0.15"));
  });

  commands.push(pdfText(margin, 632, "Report Dataset Preview", 15, "0.08 0.10 0.15"));
  commands.push(pdfText(margin, 614, "Generated sample rows are shown until backend report data endpoints are connected.", 9, "0.39 0.45 0.55"));

  const tableTop = 578;
  const rowHeight = 28;
  commands.push(pdfRect(margin, tableTop, tableWidth, rowHeight, "0.09 0.64 0.29"));

  report.fields.forEach((field, index) => {
    commands.push(
      pdfText(
        margin + index * columnWidth + 8,
        tableTop + 10,
        truncatePdfText(field, Math.max(8, Math.floor(columnWidth / 6))),
        8,
        "1 1 1",
      ),
    );
  });

  rows.slice(0, 11).forEach((row, rowIndex) => {
    const y = tableTop - rowHeight * (rowIndex + 1);
    commands.push(
      pdfRect(
        margin,
        y,
        tableWidth,
        rowHeight,
        rowIndex % 2 === 0 ? "1 1 1" : "0.97 0.98 0.99",
      ),
    );
    commands.push(`0.90 0.93 0.96 RG\n${margin} ${y} ${tableWidth} ${rowHeight} re\nS`);
    row.forEach((value, colIndex) => {
      commands.push(
        pdfText(
          margin + colIndex * columnWidth + 8,
          y + 10,
          truncatePdfText(value, Math.max(8, Math.floor(columnWidth / 6))),
          8,
          "0.18 0.22 0.30",
        ),
      );
    });
  });

  commands.push(pdfRect(42, 48, 528, 1, "0.88 0.91 0.95"));
  commands.push(pdfText(42, 28, "SHIIS - Smart Healthcare & Inventory Intelligence System", 8, "0.39 0.45 0.55"));
  commands.push(pdfText(500, 28, "Page 1", 8, "0.39 0.45 0.55"));

  const stream = commands.join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function downloadReport(report, period, format, payload) {
  const rows = reportRows(report, payload);

  if (format === "PDF") {
    downloadBlob(
      buildSimplePdf(report, period, payload),
      fileName(report.title, "pdf"),
      "application/pdf",
    );
    return;
  }

  if (format === "CSV") {
    const csv = [
      report.fields.join(","),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
      ),
    ].join("\n");
    downloadBlob(csv, fileName(report.title, "csv"), "text/csv;charset=utf-8");
    return;
  }

  if (format === "Excel") {
    const html = buildReportHtml(report, period, format);
    downloadBlob(
      html,
      fileName(report.title, "xls"),
      "application/vnd.ms-excel;charset=utf-8",
    );
    return;
  }

  downloadBlob(
      buildReportHtml(report, period, format, payload),
    fileName(report.title, "html"),
    "text/html;charset=utf-8",
  );
}

function ReportPreview({ report, period, format, payload, onDownload }) {
  if (!report) return null;

  const rows = reportRows(report, payload);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-surface-50 border border-surface-200 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
          SHIIS Report Preview
        </p>
        <h2 className="text-xl font-bold text-surface-900 mt-1">
          {report.title}
        </h2>
        <p className="text-sm text-surface-500 mt-1">{report.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
          <div>
            <span className="text-surface-400">Period</span>
            <p className="font-medium text-surface-800">
              {PERIOD_LABELS[period] ?? period}
            </p>
          </div>
          <div>
            <span className="text-surface-400">Format</span>
            <p className="font-medium text-surface-800">{format}</p>
          </div>
          <div>
            <span className="text-surface-400">Cadence</span>
            <p className="font-medium text-surface-800">{report.cadence}</p>
          </div>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto border border-surface-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-surface-100 sticky top-0">
            <tr>
              {report.fields.map((field) => (
                <th
                  key={field}
                  className="text-left px-3 py-2 font-semibold text-surface-700 border-b border-surface-200"
                >
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-white even:bg-surface-50">
                {row.map((value, index) => (
                  <td
                    key={`${rowIndex}-${index}`}
                    className="px-3 py-2 border-b border-surface-100 text-surface-700"
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onDownload}>
          <Download className="w-4 h-4" />
          Download {format}
        </Button>
      </div>
    </div>
  );
}

function ReportCard({ report, selectedFormat, onPreview, onDownload, loading }) {
  const Icon = report.icon;

  return (
    <div className="glass-card p-5 flex flex-col min-h-[260px]">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-surface-100 text-surface-600">
          {report.cadence}
        </span>
      </div>

      <div className="mt-4 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-surface-400">
          {report.category}
        </p>
        <h3 className="text-base font-semibold text-surface-900 mt-1">
          {report.title}
        </h3>
        <p className="text-sm text-surface-500 mt-2">{report.description}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-surface-500 mb-2">
          Included fields
        </p>
        <div className="flex flex-wrap gap-1.5">
          {report.fields.slice(0, 4).map((field) => (
            <span
              key={field}
              className="text-xs px-2 py-1 rounded-full bg-surface-50 border border-surface-200 text-surface-600"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPreview(report)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          Preview
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onDownload(report)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {selectedFormat}
        </Button>
      </div>
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const role = user?.roleName?.toLowerCase() || "user";
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState("PDF");
  const [period, setPeriod] = useState("last30");
  const [search, setSearch] = useState("");
  const [previewReport, setPreviewReport] = useState(null);
  const [reportPayloads, setReportPayloads] = useState({});
  const [loadingReport, setLoadingReport] = useState("");

  const visibleReports = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    return REPORTS.filter((report) => {
      const roleMatch = report.roles.includes(role);
      const categoryMatch = category === "all" || report.category === category;
      const searchMatch =
        !searchText ||
        report.title.toLowerCase().includes(searchText) ||
        report.description.toLowerCase().includes(searchText);

      return roleMatch && categoryMatch && searchMatch;
    });
  }, [category, role, search]);

  const roleReports = REPORTS.filter((report) => report.roles.includes(role));
  const categoryCounts = CATEGORY_OPTIONS.map((option) => ({
    ...option,
    count:
      option.value === "all"
        ? roleReports.length
        : roleReports.filter((report) => report.category === option.value).length,
  }));

  const reportCacheKey = (report) => `${report.title}-${period}`;

  const prepareReportPayload = async (report) => {
    const key = reportCacheKey(report);
    if (reportPayloads[key]) return reportPayloads[key];

    setLoadingReport(report.title);
    try {
      const payload = await fetchReportPayload(report, period, role, user);
      setReportPayloads((current) => ({ ...current, [key]: payload }));
      return payload;
    } finally {
      setLoadingReport("");
    }
  };

  const handlePreview = async (report) => {
    const payload = await prepareReportPayload(report);
    setPreviewReport({ report, payload });
  };

  const handleDownload = async (report) => {
    const payload = await prepareReportPayload(report);
    downloadReport(report, period, format, payload);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border-primary-500/20">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-primary-700 bg-primary-50 px-3 py-1.5 rounded-full text-xs font-medium mb-3">
              <FileText className="w-4 h-4" />
              Reports
            </div>
            <h1 className="text-2xl font-bold text-surface-900">
              Role Based Reports
            </h1>
            <p className="text-sm text-surface-500 max-w-2xl mt-1">
              {ROLE_COPY[role] ?? ROLE_COPY.user}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-surface-200 bg-white px-4 py-3">
              <p className="text-xl font-bold text-surface-900">
                {roleReports.length}
              </p>
              <p className="text-xs text-surface-500">Available</p>
            </div>
            <div className="rounded-lg border border-surface-200 bg-white px-4 py-3">
              <p className="text-xl font-bold text-surface-900">
                {visibleReports.length}
              </p>
              <p className="text-xs text-surface-500">Filtered</p>
            </div>
            <div className="rounded-lg border border-surface-200 bg-white px-4 py-3 col-span-2 sm:col-span-1">
              <p className="text-xl font-bold text-surface-900">{format}</p>
              <p className="text-xs text-surface-500">Format</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-end">
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-900">
                Report Filters
              </p>
              <p className="text-xs text-surface-500">Choose type and output</p>
            </div>
          </div>

          <label className="space-y-1.5 flex-1">
            <span className="text-xs font-medium text-surface-500">Search</span>
            <div className="relative">
              <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports"
                className="w-full rounded-lg border border-surface-200 bg-white pl-9 pr-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-surface-500">Period</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="w-full min-w-[150px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="today">Today</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="month">This month</option>
              <option value="all">All time</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-surface-500">Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="w-full min-w-[130px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {FORMAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categoryCounts
            .filter((option) => option.value === "all" || option.count > 0)
            .map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === option.value
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50"
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
        </div>
      </div>

      {visibleReports.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <FileText className="w-10 h-10 text-surface-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-surface-900">
            No reports found
          </h3>
          <p className="text-sm text-surface-500 mt-1">
            Change the category or search text to see available reports.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleReports.map((report) => (
            <ReportCard
              key={report.title}
              report={report}
              selectedFormat={format}
              onPreview={handlePreview}
              onDownload={handleDownload}
              loading={loadingReport === report.title}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(previewReport)}
        onClose={() => setPreviewReport(null)}
        title="Report Preview"
        size="xl"
      >
        <ReportPreview
          report={previewReport?.report}
          period={period}
          format={format}
          payload={previewReport?.payload}
          onDownload={() =>
            downloadReport(previewReport?.report, period, format, previewReport?.payload)
          }
        />
      </Modal>
    </div>
  );
}
