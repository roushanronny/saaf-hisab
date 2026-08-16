import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.disputeFlag.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.event.deleteMany();
  await prisma.otpSession.deleteMany();

  const mandir = await prisma.event.create({
    data: {
      slug: "ram-mandir-2026",
      name: "Ram Mandir Nirmaan Chanda 2026",
      purpose:
        "Mandir nirmaan ke liye samuhik sahyog — kisi bhi gaon se de sakte ho.",
      target: 500000,
      visibility: "public",
      adminPhone: "9800000001",
      coAdminPhone: "9800000009",
      contributions: {
        create: [
          {
            name: "Ramesh Kumar",
            phone: "9876500001",
            village: "Nawada",
            father: "Shyam Lal",
            amount: 500,
            mode: "UPI",
            txnId: "TXN9A21",
            receiptNo: "R1021",
            status: "confirmed",
            receiptSmsSent: true,
            createdAt: new Date("2026-08-10T10:22:00"),
          },
          {
            name: "Sunita Devi",
            phone: "9876500002",
            village: "Gaya",
            father: "Ram Prasad",
            amount: 1000,
            mode: "UPI",
            txnId: "TXN9A55",
            receiptNo: "R1055",
            status: "confirmed",
            receiptSmsSent: true,
            createdAt: new Date("2026-08-11T16:05:00"),
          },
          {
            name: "Amit Yadav",
            phone: "9876500003",
            village: "Jehanabad",
            father: "Bijay Yadav",
            amount: 200,
            mode: "Cash",
            receiptNo: "R1088",
            status: "confirmed",
            receiptSmsSent: true,
            createdAt: new Date("2026-08-12T09:40:00"),
          },
        ],
      },
      expenses: {
        create: [
          {
            item: "Cement bags (20)",
            vendor: "Gupta Hardware",
            vendorUpi: "gupta@upi",
            amount: 8400,
            mode: "UPI",
            txnId: "PAYOUT11",
            billNote: "UPI payout → gupta@upi",
            needsApproval: true,
            approved: true,
            approvedByPhone: "9800000009",
            createdAt: new Date("2026-08-13T14:10:00"),
          },
          {
            item: "Local labour advance",
            vendor: "Site team",
            amount: 1500,
            mode: "Cash",
            billNote: "Camera bill + GPS attached (demo)",
            gps: "24.79°N, 85.00°E",
            needsApproval: false,
            approved: true,
            createdAt: new Date("2026-08-14T11:00:00"),
          },
          {
            item: "Steel rods (pending approve demo)",
            vendor: "Metal Store",
            amount: 6200,
            mode: "Cash",
            billNote: "Awaiting co-admin",
            gps: "25.59°N, 85.13°E",
            needsApproval: true,
            approved: false,
            createdAt: new Date("2026-08-15T09:00:00"),
          },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      slug: "sunita-shaadi",
      name: "Sunita ki Shaadi Sahyog",
      purpose: "Shaadi ke kharche ke liye community help.",
      target: 100000,
      visibility: "private",
      adminPhone: "9800000002",
      coAdminPhone: "9800000008",
      contributions: {
        create: [
          {
            name: "Priya Sinha",
            phone: "9876500011",
            village: "Patna",
            father: "Anil Sinha",
            amount: 2100,
            mode: "UPI",
            txnId: "TXNB201",
            receiptNo: "R1201",
            status: "confirmed",
            receiptSmsSent: true,
            createdAt: new Date("2026-08-08T19:12:00"),
          },
        ],
      },
    },
  });

  console.log("Seeded events:", mandir.slug, "sunita-shaadi");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
