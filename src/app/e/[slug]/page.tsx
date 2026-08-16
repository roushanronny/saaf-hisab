import { notFound } from "next/navigation";
import { BackLink, Topbar } from "@/components/Topbar";
import { EventDashboard } from "@/components/EventDashboard";
import { prisma } from "@/lib/prisma";
import { hasViewAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      contributions: { orderBy: { createdAt: "desc" } },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: { flags: { orderBy: { createdAt: "desc" } } },
      },
      members: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { createdAt: "desc" }, take: 40 },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 60 },
    },
  });

  if (!event) notFound();

  const unlocked = await hasViewAccess(slug, event.viewPasswordHash);
  const hasViewPassword = Boolean(event.viewPasswordHash);

  if (hasViewPassword && !unlocked) {
    return (
      <>
        <Topbar />
        <BackLink href="/events" />
        <EventDashboard
          event={{
            slug: event.slug,
            name: event.name,
            purpose: event.purpose,
            target: event.target,
            visibility: event.visibility,
            adminPhone: event.adminPhone,
            coAdminPhone: event.coAdminPhone,
            hasAdminPin: Boolean(event.adminPinHash),
            hasViewPassword: true,
            locked: true,
            collectUpiId: null,
            collected: 0,
            spent: 0,
            balance: 0,
            contributions: [],
            expenses: [],
            members: [],
            photos: [],
            activityLogs: [],
          }}
        />
      </>
    );
  }

  const collected = event.contributions
    .filter((c) => c.status === "confirmed")
    .reduce((s, c) => s + c.amount, 0);
  const spent = event.expenses
    .filter((x) => x.approved)
    .reduce((s, x) => s + x.amount, 0);

  const payload = {
    slug: event.slug,
    name: event.name,
    purpose: event.purpose,
    target: event.target,
    visibility: event.visibility,
    adminPhone: event.adminPhone,
    coAdminPhone: event.coAdminPhone,
    hasAdminPin: Boolean(event.adminPinHash),
    hasViewPassword,
    locked: false,
    collectUpiId: event.collectUpiId,
    collected,
    spent,
    balance: collected - spent,
    contributions: event.contributions.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      village: c.village,
      father: c.father,
      amount: c.amount,
      mode: c.mode,
      status: c.status,
      receiptNo: c.receiptNo,
      confirmToken: c.confirmToken,
      createdAt: c.createdAt.toISOString(),
    })),
    expenses: event.expenses.map((x) => ({
      id: x.id,
      item: x.item,
      vendor: x.vendor,
      vendorUpi: x.vendorUpi,
      amount: x.amount,
      mode: x.mode,
      category: x.category,
      approved: x.approved,
      needsApproval: x.needsApproval,
      billNote: x.billNote,
      billPhotoData: x.billPhotoData,
      gps: x.gps,
      approvedByPhone: x.approvedByPhone,
      createdAt: x.createdAt.toISOString(),
      flags: x.flags.map((f) => ({
        id: f.id,
        byName: f.byName,
        comment: f.comment,
        status: f.status,
        createdAt: f.createdAt.toISOString(),
      })),
    })),
    members: event.members.map((m) => ({
      id: m.id,
      phone: m.phone,
      name: m.name,
      role: m.role,
    })),
    photos: event.photos
      .filter((p) => p.kind === "gallery")
      .map((p) => ({
        id: p.id,
        caption: p.caption,
        dataUrl: p.dataUrl,
        kind: p.kind,
        createdAt: p.createdAt.toISOString(),
      })),
    activityLogs: event.activityLogs.map((a) => ({
      id: a.id,
      action: a.action,
      detail: a.detail,
      actorPhone: a.actorPhone,
      actorName: a.actorName,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return (
    <>
      <Topbar />
      <BackLink href="/events" />
      <EventDashboard event={payload} />
    </>
  );
}
