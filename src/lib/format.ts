export function rupee(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return base || `event-${Date.now()}`;
}

export function formatWhen(d: Date) {
  // UTC only — same on server + client (avoids hydration mismatch)
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export function receiptNo() {
  return "R" + Math.floor(1000 + Math.random() * 9000);
}

export function txnId(prefix: string) {
  return prefix + Math.floor(Math.random() * 1e5);
}

export function confirmToken() {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

/** Cash/expenses ≥ this need co-admin approve */
export const APPROVAL_THRESHOLD = 5000;
