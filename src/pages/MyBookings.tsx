import { useCallback, useEffect, useRef, useState } from "react";
import {
  getService,
  listMyBookings,
  listProviderReservations,
  type Reservation,
  type Service,
} from "../services/services";
import { getMyProfile, type UserProfile } from "../services/user";
import ReservationList from "../components/ReservationList";

export default function MyBookings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clientReservations, setClientReservations] = useState<Reservation[]>([]);
  const [providerReservations, setProviderReservations] = useState<Reservation[]>([]);
  const [servicesCache, setServicesCache] = useState<Record<number, Service>>({});
  const servicesCacheRef = useRef<Record<number, Service>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    servicesCacheRef.current = servicesCache;
  }, [servicesCache]);

  const hydrateServices = useCallback(async (reservations: Reservation[]) => {
    const cache = servicesCacheRef.current;
    const missing = Array.from(
      new Set(reservations.map((r) => r.service_id).filter((id) => !(id in cache))),
    );
    if (!missing.length) return;
    const entries = await Promise.all(
      missing.map(async (id) => {
        const svc = await getService(id);
        return [id, svc] as const;
      }),
    );
    setServicesCache((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }, []);

  useEffect(() => {
    document.title = "Mis Reservas";
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const fetchedProfile = await getMyProfile().catch(() => null);
        if (!active) return;
        setProfile(fetchedProfile);
        const clientList = await listMyBookings();
        let providerList: Reservation[] = [];
        if (fetchedProfile?.role === "PROVIDER") {
          providerList = await listProviderReservations();
        }
        if (!active) return;
        setClientReservations(clientList);
        setProviderReservations(providerList);
        await hydrateServices([...clientList, ...providerList]);
      } catch (error) {
        if (active) setErr((error as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrateServices]);

  const isProvider = profile?.role === "PROVIDER";

  return (
    <section className="section">
      <div className="container">
        <h1 className="h2">Mis Reservas</h1>

        {loading && <p className="muted">Cargando...</p>}
        {err && <p className="muted" style={{ color: '#b00020' }}>{err}</p>}

        <div className="reservations-page-grid">
          <div className="card">
            <h2 className="h3">Reservas que solicité</h2>
            <ReservationList
              reservations={clientReservations}
              servicesCache={servicesCache}
              loading={loading && !clientReservations.length}
              emptyMessage="No realizaste reservas todavía."
            />
          </div>
          {isProvider && (
            <div className="card">
              <h2 className="h3">Reservas que debo atender</h2>
              <ReservationList
                reservations={providerReservations}
                servicesCache={servicesCache}
                loading={loading && !providerReservations.length}
                emptyMessage="Aún no recibiste reservas de clientes."
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}