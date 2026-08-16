"use client";

import { useUI } from "@/components/Providers";

export function ExpensePageHeader() {
  const { t } = useUI();
  return (
    <>
      <h1 className="font-display text-[1.45rem]">{t.expenseTitle}</h1>
      <p className="mb-4 text-[0.95rem] text-[var(--muted)]">{t.expenseSub}</p>
    </>
  );
}
