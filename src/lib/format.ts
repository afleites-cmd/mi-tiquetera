// Formato de fechas y montos para Argentina, independiente de la zona horaria del servidor.
export const TZ = "America/Argentina/Buenos_Aires";

export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-AR", { timeZone: TZ }) : "—";

export const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("es-AR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });

export const ars = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
