import { useCallback, useEffect, useRef, useState } from "react";
import { getMyProfile, updateMyProfile, type UserProfile, type UserProfileUpdate } from "../services/user";
import { Link } from "react-router-dom";
import { BASE_URL, getToken } from "../services/api";
import {
  getService,
  listMyServices,
  listMyBookings,
  listProviderReservations,
  updateReservationStatus,
  type Service,
  type Reservation,
  type ReservationReview,
  type ReservationStatus,
} from "../services/services";
import ReservationList from "../components/ReservationList";
import ReservationReviewControls from "../components/ReservationReviewControls";
import { isReservationFinal } from "../utils/reservations";

type AccountTab = "profile" | "my-services" | "orders" | "reservations" | "providers";

type ProviderDashboardData = {
  provider_id: number;
  totals: {
    services_published: number;
    reservations_total: number;
    reservations_completed: number;
    favorites_count: number;
  };
  ratings: { average: number; count: number };
  revenue: { total: number; currency: string };
};

const ACCOUNT_TAB_STORAGE_KEY = "account_active_tab";
const ACCOUNT_TABS: AccountTab[] = [
  "profile",
  "my-services",
  "orders",
  "reservations",
  "providers",
];

const isAccountTab = (value: string | null): value is AccountTab =>
  Boolean(value && ACCOUNT_TABS.includes(value as AccountTab));

const getInitialAccountTab = (): AccountTab => {
  if (typeof window === "undefined") return "profile";
  const stored = window.localStorage.getItem(ACCOUNT_TAB_STORAGE_KEY);
  return isAccountTab(stored) ? stored : "profile";
};

export default function Account() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTabState] = useState<AccountTab>(() => getInitialAccountTab());
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [reservationsClient, setReservationsClient] = useState<Reservation[]>([]);
  const [reservationsProvider, setReservationsProvider] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [reservationsAttempted, setReservationsAttempted] = useState(false);
  const [reservationMutations, setReservationMutations] = useState<Record<number, boolean>>({});
  const [reservationActionError, setReservationActionError] = useState<string | null>(null);
  const [providerDashboard, setProviderDashboard] = useState<ProviderDashboardData | null>(null);
  const [providerDashboardLoading, setProviderDashboardLoading] = useState(false);
  const [providerDashboardError, setProviderDashboardError] = useState<string | null>(null);
  const [servicesCache, setServicesCache] = useState<Record<number, Service>>({});
  const servicesCacheRef = useRef<Record<number, Service>>({});
  const providerDashboardAutoRequested = useRef(false);

  const setActiveTabPersisted = useCallback((tab: AccountTab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCOUNT_TAB_STORAGE_KEY, tab);
    }
  }, []);

  const handleTabChange = useCallback(
    (tab: AccountTab) => {
      setActiveTabPersisted(tab);
      if (tab === "reservations") {
        setReservationsAttempted(false);
      }
    },
    [setActiveTabPersisted, setReservationsAttempted],
  );

  const isProvider = profile?.role === "PROVIDER";
  const profileId = profile?.id ?? null;

  const loadProviderDashboard = useCallback(async () => {
    if (!isProvider) return;
    setProviderDashboardLoading(true);
    setProviderDashboardError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("No se encontró tu sesión.");
      const res = await fetch(`${BASE_URL}/providers/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const data = (await res.json()) as ProviderDashboardData;
      setProviderDashboard(data);
    } catch (error) {
      setProviderDashboardError((error as Error).message);
    } finally {
      setProviderDashboardLoading(false);
    }
  }, [isProvider]);

  useEffect(() => {
    setLoadingProfile(true);
    setProfileError(null);
    getMyProfile()
      .then(async (p) => {
        setProfile(p);
        if (p.role === "PROVIDER") {
          try {
            const svcs = await listMyServices();
            setMyServices(svcs);
          } catch (error) {
            console.warn("No se pudieron cargar tus servicios", error);
          }
        } else {
          setMyServices([]);
        }
      })
      .catch(() => setProfileError("No se pudo cargar tu perfil"))
      .finally(() => setLoadingProfile(false));
  }, []);

  useEffect(() => {
    if (!profile) return;
    if (!isProvider && activeTab === "my-services") {
      setActiveTabPersisted("profile");
    }
  }, [profile, isProvider, activeTab, setActiveTabPersisted]);

  useEffect(() => {
    if (!isProvider) return;
    if (providerDashboardAutoRequested.current) return;
    providerDashboardAutoRequested.current = true;
    loadProviderDashboard();
  }, [isProvider, loadProviderDashboard]);

  useEffect(() => {
    if (providerDashboard) {
      setProviderDashboardError(null);
    }
  }, [providerDashboard]);


  useEffect(() => {
    servicesCacheRef.current = servicesCache;
  }, [servicesCache]);

  const hydrateServiceCache = useCallback(async (reservations: Reservation[]) => {
    const cache = servicesCacheRef.current;
    const pendingIds = Array.from(
      new Set(reservations.map((r) => r.service_id).filter((serviceId) => !(serviceId in cache))),
    );
    if (!pendingIds.length) return;
    const entries = await Promise.all(
      pendingIds.map(async (serviceId) => {
        const svc = await getService(serviceId);
        return [serviceId, svc] as const;
      }),
    );
    setServicesCache((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }, []);

  const setReservationMutatingFor = useCallback((reservationId: number, active: boolean) => {
    setReservationMutations((prev) => {
      const next = { ...prev };
      if (active) next[reservationId] = true;
      else delete next[reservationId];
      return next;
    });
  }, []);

  const applyReservationUpdate = useCallback((updated: Reservation) => {
    setReservationsClient((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setReservationsProvider((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const handleReviewSaved = useCallback((reservationId: number, review: ReservationReview) => {
    setReservationsClient((prev) => prev.map((r) => (r.id === reservationId ? { ...r, review } : r)));
    setReservationsProvider((prev) => prev.map((r) => (r.id === reservationId ? { ...r, review } : r)));
  }, []);

  const handleReservationStatusChange = useCallback(
    async (reservationId: number, status: ReservationStatus) => {
      setReservationActionError(null);
      setReservationMutatingFor(reservationId, true);
      try {
        const updated = await updateReservationStatus(reservationId, status);
        applyReservationUpdate(updated);
      } catch (error) {
        setReservationActionError((error as Error).message);
      } finally {
        setReservationMutatingFor(reservationId, false);
      }
    },
    [applyReservationUpdate, setReservationMutatingFor],
  );

  const renderClientActions = useCallback(
    (reservation: Reservation) => {
      if (!profileId) return null;
      if (reservation.client_id !== profileId) return null;
      if (isReservationFinal(reservation.status)) return null;
      if (reservation.status !== "pending" && reservation.status !== "confirmed") return null;

      const busy = Boolean(reservationMutations[reservation.id]);
      return (
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() => handleReservationStatusChange(reservation.id, "cancelled_by_client")}
        >
          {busy ? "Actualizando..." : "Cancelar"}
        </button>
      );
    },
    [profileId, reservationMutations, handleReservationStatusChange],
  );

  const renderClientDetails = useCallback(
    (reservation: Reservation) => {
      if (!profileId || reservation.client_id !== profileId) return null;
      return (
        <ReservationReviewControls
          reservation={reservation}
          onReviewSaved={handleReviewSaved}
        />
      );
    },
    [profileId, handleReviewSaved],
  );

  const renderProviderActions = useCallback(
    (reservation: Reservation) => {
      if (!isProvider) return null;
      if (isReservationFinal(reservation.status)) return null;
      if (reservation.status !== "pending" && reservation.status !== "confirmed") return null;

      const busy = Boolean(reservationMutations[reservation.id]);
      return (
        <>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy}
            onClick={() => handleReservationStatusChange(reservation.id, "completed")}
          >
            {busy ? "Actualizando..." : "Marcar resuelta"}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy}
            onClick={() => handleReservationStatusChange(reservation.id, "cancelled_by_provider")}
          >
            {busy ? "Actualizando..." : "Cancelar"}
          </button>
        </>
      );
    },
    [isProvider, reservationMutations, handleReservationStatusChange],
  );

  const loadReservations = useCallback(async () => {
    if (!profile) return;
    setReservationsAttempted(true);
    setReservationsLoading(true);
    setReservationsError(null);
    setReservationActionError(null);
    try {
      const [clientList, providerList] = await Promise.all([
        listMyBookings(),
        profile.role === "PROVIDER" ? listProviderReservations() : Promise.resolve([]),
      ]);
      setReservationsClient(clientList);
      setReservationsProvider(providerList);
      await hydrateServiceCache([...clientList, ...providerList]);
    } catch (error) {
      setReservationsError((error as Error).message);
    } finally {
      setReservationsLoading(false);
    }
  }, [profile, hydrateServiceCache]);

  useEffect(() => {
    if (!profile || profile.role !== "PROVIDER") return;
    if (activeTab === "reservations") return;
    if (reservationsAttempted) return;
    loadReservations();
  }, [profile, activeTab, reservationsAttempted, loadReservations]);

  useEffect(() => {
    if (activeTab !== "reservations" || reservationsAttempted) return;
    loadReservations();
  }, [activeTab, reservationsAttempted, loadReservations]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload: UserProfileUpdate = {
        full_name: profile.full_name,
        phone: profile.phone ?? null,
        province: profile.province ?? null,
        city: profile.city ?? null,
      };
      const updated = await updateMyProfile(payload);
      setProfile(updated);
    } catch (error: unknown) {
      setFormError((error as Error)?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loadingProfile) return <div className="container"><p>Cargando…</p></div>;
  if (!profile) return <div className="container"><p>{profileError ?? "No se encontró tu perfil."}</p></div>;

  const tabItems: Array<{ key: AccountTab; label: string }> = [
    { key: "profile", label: "Mi perfil" },
    { key: "orders", label: "Servicios pedidos" },
    { key: "reservations", label: "Mis reservas" },
  ];
  if (isProvider) {
    tabItems.splice(1, 0, { key: "my-services", label: "Mis servicios" });
  }
  tabItems.push({ key: "providers", label: isProvider ? "Panel proveedor" : "Proveedores" });

  const providerTotals = {
    servicesPublished: providerDashboard?.totals?.services_published ?? myServices.length,
    reservationsTotal: providerDashboard?.totals?.reservations_total ?? reservationsProvider.length,
    reservationsCompleted:
      providerDashboard?.totals?.reservations_completed ??
      reservationsProvider.filter((r) => r.status === "completed").length,
    favoritesCount: providerDashboard?.totals?.favorites_count ?? 0,
  };

  const providerRatings = {
    average: providerDashboard?.ratings?.average ?? 0,
    count: providerDashboard?.ratings?.count ?? 0,
  };

  const providerRevenue = {
    total: providerDashboard?.revenue?.total ?? 0,
    currency: providerDashboard?.revenue?.currency ?? "ARS",
  };

  return (
    <section className="section" style={{ padding: "64px 0 0" }}>
      <div className="container account-layout">
        <aside className="card account-sidebar">
          <div className="account-tabs">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`account-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </aside>
        <main className="account-main">
          {activeTab === "profile" && (
            <div className="card form account-card">
              <h2 className="h2">Mi perfil</h2>
              <p className="muted">Gestioná tus datos personales</p>
              <form onSubmit={onSave} className="account-card__content">
                <div className="form-row">
                  <label className="label">Nombre</label>
                  <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="label">Email</label>
                  <input value={profile.email} readOnly />
                </div>
                <div className="form-row">
                  <label className="label">Teléfono</label>
                  <input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="label">Provincia</label>
                  <input value={profile.province ?? ""} onChange={(e) => setProfile({ ...profile, province: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="label">Ciudad</label>
                  <input value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
                </div>
                {formError && <div className="muted" style={{ color: "#b00020" }}>{formError}</div>}
                <div className="actions account-card__actions">
                  <button className="btn btn--primary" disabled={saving}>
                    {saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "my-services" && isProvider && (
            <div className="card account-card">
              <h2 className="h2">Mis servicios publicados</h2>
              <p className="muted">Total publicados: {myServices.length}</p>
              <div className="account-card__content">
                {myServices.length === 0 ? (
                  <p className="muted">Todavía no creaste servicios.</p>
                ) : (
                  <div className="services-table-wrapper">
                    <table className="services-table">
                      <thead>
                        <tr>
                          <th>Servicio</th>
                          <th>Precio</th>
                          <th>Estado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {myServices.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <div className="service-title">{s.title}</div>
                              <div className="muted-small">ID #{s.id}</div>
                            </td>
                            <td>{s.price_to_agree ? "A convenir" : `${s.currency} ${s.price.toLocaleString()}`}</td>
                            <td>
                              <span className={`chip ${s.active ? "chip--success" : "chip--muted"}`}>
                                {s.active ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="services-actions">
                                <a className="btn btn--ghost" href={`/services/${s.id}`}>Ver</a>
                                <a className="btn btn--ghost" href={`/services/${s.id}/edit`}>Editar</a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="account-card__actions" style={{ marginTop: 12 }}>
                  <Link className="btn btn--primary" to="/services/new">Crear nuevo servicio</Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="card account-card">
              <h2 className="h2">Servicios pedidos</h2>
              <div className="account-card__content">
                <p className="muted">Próximamente podrás ver y gestionar tus pedidos desde aquí.</p>
              </div>
            </div>
          )}

          {activeTab === "reservations" && (
            <div className="card account-card">
              <div className="account-card__header">
                <div>
                  <h2 className="h2">Mis reservas</h2>
                  <p className="muted">Divide tus reservas como cliente y las que debés atender como proveedor.</p>
                </div>
              </div>
              <div className="account-card__content reservations-stack">
                {reservationsError && (
                  <div className="alert alert--error">
                    {reservationsError}
                    <button type="button" className="btn btn--ghost" onClick={loadReservations} style={{ marginLeft: "auto" }}>
                      Reintentar
                    </button>
                  </div>
                )}
                {reservationActionError && (
                  <p className="muted" style={{ color: "#b00020" }}>{reservationActionError}</p>
                )}
                <div className="reservation-column">
                  <h3 className="h3">Reservas que solicité</h3>
                  <ReservationList
                    reservations={reservationsClient}
                    servicesCache={servicesCache}
                    loading={reservationsLoading && !reservationsClient.length}
                    loadingMessage="Cargando reservas..."
                    emptyMessage="Todavía no hiciste reservas."
                    actionRenderer={renderClientActions}
                    detailRenderer={renderClientDetails}
                  />
                </div>
                {isProvider && (
                  <div className="reservation-column">
                    <h3 className="h3">Reservas que debo atender</h3>
                    <ReservationList
                      reservations={reservationsProvider}
                      servicesCache={servicesCache}
                      loading={reservationsLoading && !reservationsProvider.length}
                      loadingMessage="Cargando reservas del proveedor..."
                      emptyMessage="Aún no recibiste reservas de clientes."
                      actionRenderer={renderProviderActions}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "providers" && (
            <div className="card account-card">
              <h2 className="h2">{isProvider ? "Panel de proveedor" : "Proveedores"}</h2>
        <div className="card" style={{marginTop:16}}>
          <h3 className="h3">Mis Reservas</h3>
          <p>Ver el historial de todos los servicios que has reservado.</p>
          <Link className="btn btn--primary" to="/my-bookings">Ver mis reservas</Link>
        </div>

        <div className="card" style={{marginTop:16}}>
          <h3 className="h3">Proveedores</h3>
          {profile.role === 'PROVIDER' ? (
            <>
              <p>Accede a tu panel de proveedor para ver métricas y configurar tus servicios.</p>
              <Link className="btn btn--primary" to="/provider">Ver panel</Link>
            </>
          ) : (
            <>
              <p>¿Querés publicar servicios? Convertite en proveedor completando tu perfil fiscal.</p>
              <Link className="btn btn--primary" to="/become-provider">Quiero ser proveedor</Link>
            </>
          )}
          </div>
          {activeTab==='metrics' && profile.role==='PROVIDER' && (
            <div className="card account-card" style={{flex:1}}>
              <h2 className="h2">Métricas</h2>
              <div className="account-card__content">
                {isProvider ? (
                  <div className="provider-panel">
                    <div className="provider-panel__actions">
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={loadProviderDashboard}
                        disabled={providerDashboardLoading}
                      >
                        {providerDashboardLoading ? "Actualizando…" : "Actualizar datos"}
                      </button>
                    </div>
                    {providerDashboardError && (
                      <div className="alert alert--error">
                        {providerDashboardError}
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={loadProviderDashboard}
                          style={{ marginLeft: "auto" }}
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                    {providerDashboardLoading && !providerDashboard && (
                      <p className="muted">Cargando panel...</p>
                    )}
                    {(!providerDashboardLoading || providerDashboard) && (
                      <>
                        <div className="provider-panel__grid">
                          <div className="provider-panel__tile">
                            <p className="muted">Servicios publicados</p>
                            <strong>{providerTotals.servicesPublished}</strong>
                          </div>
                          <div className="provider-panel__tile">
                            <p className="muted">Reservas totales</p>
                            <strong>{providerTotals.reservationsTotal}</strong>
                          </div>
                          <div className="provider-panel__tile">
                            <p className="muted">Reservas completadas</p>
                            <strong>{providerTotals.reservationsCompleted}</strong>
                          </div>
                          <div className="provider-panel__tile">
                            <p className="muted">Favoritos</p>
                            <strong>{providerTotals.favoritesCount}</strong>
                          </div>
                        </div>
                        <div className="provider-panel__section">
                          <div className="provider-panel__section-head">
                            <h3 className="h3">Mis servicios</h3>
                            <Link className="btn btn--primary" to="/services/new">Crear nuevo servicio</Link>
                          </div>
                          {myServices.length === 0 ? (
                            <p className="muted">Todavía no creaste servicios.</p>
                          ) : (
                            <ul className="provider-panel__list">
                              {myServices.map((s) => (
                                <li key={s.id}>
                                  <div>
                                    <div className="service-title">{s.title}</div>
                                    <div className="muted-small">ID #{s.id}</div>
                                  </div>
                                  <div className="provider-panel__list-actions">
                                    <a className="btn btn--ghost" href={`/services/${s.id}`}>Ver</a>
                                    <a className="btn btn--ghost" href={`/services/${s.id}/edit`}>Editar</a>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="provider-panel__section">
                          <h3 className="h3">Reputación</h3>
                          <p>
                            Rating promedio: {providerRatings.average} ({providerRatings.count} reseñas)
                          </p>
                        </div>
                        <div className="provider-panel__section">
                          <h3 className="h3">Ingresos</h3>
                          <p>
                            Total: {providerRevenue.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {providerRevenue.currency}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="muted">¿Querés publicar servicios? Completa tu información fiscal y activa tu perfil.</p>
                    <Link className="btn btn--primary" to="/become-provider">Quiero ser proveedor</Link>
                  </>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </section>
  );
}
