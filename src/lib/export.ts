export function downloadReceiptPdf(opts: {
  receiptNo: string;
  name: string;
  amount: number;
  eventName: string;
  phone: string;
  mode: string;
  sms?: string;
}) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt ${opts.receiptNo}</title>
  <style>
    body{font-family:Georgia,serif;padding:32px;color:#14221c;max-width:520px;margin:auto}
    h1{font-size:22px;margin:0 0 4px} .muted{color:#4a5c52;font-size:13px}
    .box{border:1px solid #cfd9d3;border-radius:12px;padding:16px;margin-top:18px}
    .row{display:flex;justify-content:space-between;margin:8px 0;font-size:15px}
    .amt{font-size:28px;font-weight:700;margin:12px 0}
  </style></head><body>
  <h1>SAAF Hisāb</h1>
  <div class="muted">Contribution receipt</div>
  <div class="box">
    <div class="row"><span>Receipt</span><strong>${opts.receiptNo}</strong></div>
    <div class="row"><span>Event</span><strong>${escapeHtml(opts.eventName)}</strong></div>
    <div class="row"><span>Donor</span><strong>${escapeHtml(opts.name)}</strong></div>
    <div class="row"><span>Phone</span><strong>${escapeHtml(opts.phone)}</strong></div>
    <div class="row"><span>Mode</span><strong>${escapeHtml(opts.mode)}</strong></div>
    <div class="amt">₹${Number(opts.amount).toLocaleString("en-IN")}</div>
    ${opts.sms ? `<p class="muted">${escapeHtml(opts.sms)}</p>` : ""}
  </div>
  <script>window.onload=()=>{window.print()}</script>
  </body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=640,height=720");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportDonorsCsv(
  eventName: string,
  rows: { name: string; phone: string; village: string; father: string; amount: number; mode: string; status: string; createdAt: string }[]
) {
  const header = ["Name", "Phone", "Village", "Father", "Amount", "Mode", "Status", "Date"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.name, r.phone, r.village, r.father, r.amount, r.mode, r.status, r.createdAt]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${eventName.replace(/\s+/g, "-").slice(0, 40)}-donors.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportExpensesCsv(
  eventName: string,
  rows: {
    item: string;
    vendor: string;
    amount: number;
    mode: string;
    category?: string | null;
    approved: boolean;
    createdAt: string;
  }[]
) {
  const header = ["Item", "Vendor", "Category", "Amount", "Mode", "Approved", "Date"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.item, r.vendor, r.category || "", r.amount, r.mode, r.approved ? "yes" : "no", r.createdAt]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${eventName.replace(/\s+/g, "-").slice(0, 40)}-expenses.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadEventReportPdf(opts: {
  eventName: string;
  purpose?: string | null;
  collected: number;
  spent: number;
  balance: number;
  target?: number | null;
  donors: { name: string; amount: number; mode: string; status: string; createdAt: string }[];
  expenses: {
    item: string;
    vendor: string;
    category?: string | null;
    amount: number;
    mode: string;
    approved: boolean;
    createdAt: string;
  }[];
}) {
  const pct =
    opts.target && opts.target > 0
      ? Math.min(100, Math.round((opts.collected / opts.target) * 100))
      : null;
  const donorRows = opts.donors
    .filter((d) => d.status === "confirmed")
    .map(
      (d) =>
        `<tr><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.mode)}</td><td>₹${d.amount.toLocaleString("en-IN")}</td><td>${d.createdAt.slice(0, 10)}</td></tr>`
    )
    .join("");
  const expenseRows = opts.expenses
    .map(
      (x) =>
        `<tr><td>${escapeHtml(x.item)}</td><td>${escapeHtml(x.category || "—")}</td><td>${escapeHtml(x.vendor)}</td><td>₹${x.amount.toLocaleString("en-IN")}</td><td>${x.approved ? "✓" : "…"}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Report — ${escapeHtml(opts.eventName)}</title>
  <style>
    body{font-family:Georgia,serif;padding:28px;color:#13241c;max-width:760px;margin:auto}
    h1{font-size:24px;margin:0} .muted{color:#4d6358;font-size:13px}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:18px 0}
    .card{border:1px solid #cfd9d3;border-radius:10px;padding:12px}
    .big{font-size:22px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
    th,td{border-bottom:1px solid #e2e8e4;padding:8px 6px;text-align:left}
    .bar{height:10px;background:#e2e8e4;border-radius:6px;overflow:hidden;margin-top:8px}
    .fill{height:100%;background:#b85c18}
  </style></head><body>
  <h1>साफ़ हिसाब — रिपोर्ट</h1>
  <div class="muted">${escapeHtml(opts.eventName)}${opts.purpose ? " · " + escapeHtml(opts.purpose) : ""}</div>
  <div class="grid">
    <div class="card"><div class="muted">Collected</div><div class="big">₹${opts.collected.toLocaleString("en-IN")}</div></div>
    <div class="card"><div class="muted">Spent</div><div class="big">₹${opts.spent.toLocaleString("en-IN")}</div></div>
    <div class="card"><div class="muted">Balance</div><div class="big">₹${opts.balance.toLocaleString("en-IN")}</div></div>
  </div>
  ${
    opts.target
      ? `<div class="card"><div class="muted">Target ₹${opts.target.toLocaleString("en-IN")} · ${pct}%</div><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`
      : ""
  }
  <h2>Donors</h2>
  <table><thead><tr><th>Name</th><th>Mode</th><th>Amount</th><th>Date</th></tr></thead><tbody>${donorRows || "<tr><td colspan=4>—</td></tr>"}</tbody></table>
  <h2>Expenses</h2>
  <table><thead><tr><th>Item</th><th>Category</th><th>Vendor</th><th>Amount</th><th>OK</th></tr></thead><tbody>${expenseRows || "<tr><td colspan=5>—</td></tr>"}</tbody></table>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
