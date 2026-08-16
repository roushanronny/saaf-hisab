"use client";

import { useUI } from "@/components/Providers";

export function SiteFooter() {
  const { t } = useUI();
  return (
    <footer className="site-footer">
      <span>{t.madeBy}</span>
    </footer>
  );
}
