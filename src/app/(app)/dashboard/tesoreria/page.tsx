// ENTREGABLE 3: Dashboard de Tesorería (Server Component)
// Consulta Prisma y agrupa facturas. La interactividad (tabs, modal de pago) vive en
// el client component DashboardTesoreria.

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { DUE_ALERT_DAYS, PAYMENT_CONDITIONS, daysUntilDue } from "@/lib/workflow";
import {
  DashboardTesoreria,
  type InvoiceRow,
} from "@/components/tesoreria/DashboardTesoreria";

export const dynamic = "force-dynamic";

export default async function TesoreriaPage() {
  const user = await requirePermission("VER_TESORERIA");

  const since = new Date();
  since.setDate(since.getDate() - 60);

  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [{ payment: null }, { payment: { paymentDate: { gte: since } } }],
    },
    include: {
      payment: true,
      quote: { select: { supplier: true } },
      ticket: { include: { location: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const today = new Date();
  const rows: InvoiceRow[] = invoices.map((inv) => ({
    invoiceId: inv.id,
    ticketId: inv.ticketId,
    invoiceNumber: inv.invoiceNumber,
    supplier: inv.quote.supplier,
    priority: inv.ticket.priority,
    location: inv.ticket.location.name,
    description: inv.ticket.description,
    amount: inv.amount.toNumber(),
    condition: inv.condition,
    conditionLabel: PAYMENT_CONDITIONS[inv.condition].label,
    dueDate: inv.dueDate.toISOString(),
    daysLeft: daysUntilDue(inv.dueDate, today),
    paid: inv.payment !== null,
    paymentDate: inv.payment?.paymentDate.toISOString() ?? null,
    fileUrl: inv.fileUrl,
    receiptUrl: inv.payment?.receiptUrl ?? null,
  }));

  const pending = rows.filter((r) => !r.paid);

  const groups = {
    // Alerta: vencidas o que vencen en <= 5 días (cualquier condición, incluida C/C)
    dueSoon: pending.filter((r) => r.daysLeft <= DUE_ALERT_DAYS),
    // Vista por condición: toda la cuenta corriente pendiente, venza cuando venza
    currentAccount: pending.filter((r) => r.condition === "CUENTA_CORRIENTE"),
    // Resto de pendientes a más de 5 días (para no perderlas de vista)
    upcoming: pending.filter(
      (r) => r.daysLeft > DUE_ALERT_DAYS && r.condition !== "CUENTA_CORRIENTE",
    ),
    paid: rows.filter((r) => r.paid),
  };

  return <DashboardTesoreria groups={groups} canPay={can(user, "REGISTRAR_PAGOS")} />;
}
