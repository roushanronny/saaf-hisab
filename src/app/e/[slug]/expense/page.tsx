import { notFound } from "next/navigation";
import { BackLink, Topbar } from "@/components/Topbar";
import { ExpenseForm } from "@/components/ExpenseForm";
import { prisma } from "@/lib/prisma";
import { ExpensePageHeader } from "@/components/ExpensePageHeader";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ExpensePage({ params }: Props) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  return (
    <>
      <Topbar />
      <BackLink href={`/e/${slug}`} />
      <ExpensePageHeader />
      <ExpenseForm
        slug={slug}
        coAdminPhone={event.coAdminPhone}
        hasAdminPin={Boolean(event.adminPinHash)}
      />
    </>
  );
}
