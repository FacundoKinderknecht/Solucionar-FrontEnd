import type { ReservationStatus } from "../services/services";

const STATUS_LABELS: Record<ReservationStatus, { label: string; chipClass: string }> = {
  pending: { label: "Pendiente", chipClass: "chip--muted" },
  confirmed: { label: "Confirmada", chipClass: "chip--success" },
  completed: { label: "Completada", chipClass: "chip--success" },
  cancelled_by_client: { label: "Cancelada por vos", chipClass: "chip--muted" },
  cancelled_by_provider: { label: "Cancelada por proveedor", chipClass: "chip--muted" },
};

export function getReservationStatusMeta(status: ReservationStatus) {
  return STATUS_LABELS[status] ?? STATUS_LABELS.pending;
}

export function isReservationFinal(status: ReservationStatus) {
  return (
    status === "completed" ||
    status === "cancelled_by_client" ||
    status === "cancelled_by_provider"
  );
}
