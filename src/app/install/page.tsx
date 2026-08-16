"use client";

import { BackLink, Topbar } from "@/components/Topbar";
import { InstallApp } from "@/components/InstallApp";
import { useUI } from "@/components/Providers";

export default function InstallPage() {
  const { t } = useUI();

  return (
    <>
      <Topbar />
      <BackLink href="/" label={t.home} />
      <InstallApp variant="page" />
    </>
  );
}
