import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyBookings, type Booking } from "../services/services";

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Mis Reservas";
    listMyBookings()
      .then(setBookings)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section">
      <div className="container">
        <h1 className="h2">Mis Reservas</h1>

        {loading && <p className="muted">Cargando...</p>}
        {err && <p className="muted" style={{ color: '#b00020' }}>{err}</p>}

        {!loading && bookings.length === 0 && (
          <div className="card"><p className="muted">No has realizado ninguna reserva todavía.</p></div>
        )}

        {bookings.length > 0 && (
          <div style={{display: 'grid', gap: 16}}>
            {bookings.map((booking) => (
              <div key={booking.id} className="card">
                <div className="card__body">
                  <h3 className="h3">{booking.service?.title ?? 'Servicio eliminado'}</h3>
                  <div className="muted" style={{ marginBottom: 8, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>Estado: <strong>{booking.status}</strong></span>
                    <span>Reservado el: {booking.created_at ? new Date(booking.created_at).toLocaleDateString() : '—'}</span>
                  </div>
                  <p className="muted">
                    {booking.service ? `${booking.service.currency} ${booking.service.price.toFixed(2)} • ${booking.service.duration_min > 0 ? `${booking.service.duration_min} min` : 'Duración a convenir'}` : 'Sin detalles del servicio.'}
                  </p>
                  <div style={{ marginTop: 16 }}>
                    {booking.service?.id ? (
                      <Link className="btn btn--ghost" to={`/services/${booking.service.id}`}>Ver Servicio</Link>
                    ) : (
                      <button className="btn btn--ghost" disabled>Ver Servicio</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}