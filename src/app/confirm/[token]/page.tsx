import { Topbar } from "@/components/Topbar";
import { ConfirmClient } from "./ConfirmClient";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ a?: string }>;
};

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  return (
    <>
      <Topbar pill="Phase 3" />
      <ConfirmClient token={token} initialAction={sp.a || null} />
    </>
  );
}
