import type { ReactNode } from "react";
import type { Reservation, Service } from "../services/services";
import { getReservationStatusMeta } from "../utils/reservations";

type Props = {
  reservations: Reservation[];
  servicesCache: Record<number, Service>;
  loading: boolean;
  emptyMessage: string;
  loadingMessage?: string;
  actionRenderer?: (reservation: Reservation) => ReactNode;
  detailRenderer?: (reservation: Reservation) => ReactNode;
};

export default function ReservationList({
  reservations,
  servicesCache,
  loading,
  emptyMessage,
  loadingMessage = "Cargando reservas...",
  actionRenderer,
  detailRenderer,
}: Props) {
  if (loading) return <p className="muted">{loadingMessage}</p>;
  if (!reservations.length) return <p className="muted">{emptyMessage}</p>;

  return (
    <ul className="reservation-list">
      {reservations.map((res) => {
        const svc = servicesCache[res.service_id];
        const meta = getReservationStatusMeta(res.status);
        const reservationDate = new Date(res.reservation_datetime);
        const createdDate = new Date(res.created_at);
        const detailContent = detailRenderer ? detailRenderer(res) : null;
        return (
          <li key={res.id} className="reservation-item">
            <div>
              <div className="reservation-title">{svc?.title ?? `Servicio #${res.service_id}`}</div>
              <div className="reservation-meta">
                <span>{reservationDate.toLocaleString()}</span>
                <span>Creada {createdDate.toLocaleDateString()}</span>
                {svc ? (
                  <span>
                    {svc.price_to_agree
                      ? "Precio a convenir"
                      : `${svc.currency} ${svc.price.toLocaleString()}`}
                  </span>
                ) : (
                  <span>Detalles cargando…</span>
                )}
              </div>
              {res.notes && <p className="muted reservation-notes">Notas: {res.notes}</p>}
            </div>
            <div className="reservation-actions">
              <span className={`chip ${meta.chipClass}`}>{meta.label}</span>
              {actionRenderer ? (
                <div className="reservation-actions__buttons">{actionRenderer(res)}</div>
              ) : null}
            </div>
            {detailContent ? <div className="reservation-extra">{detailContent}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
