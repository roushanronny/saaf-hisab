import { notFound } from "next/navigation";
import { BackLink, Topbar } from "@/components/Topbar";
import { ContributeWizard } from "@/components/ContributeWizard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ContributePage({ params }: Props) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  return (
    <>
      <Topbar />
      <BackLink href={`/e/${slug}`} />
      <ContributeWizard
        slug={slug}
        eventName={event.name}
        collectUpiId={event.collectUpiId}
      />
    </>
  );
}
