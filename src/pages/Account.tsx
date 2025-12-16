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

type AccountTab = "profile" | "my-services" | "reservations" | "reviews" | "providers";

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
  "reservations",
  "reviews",
  "providers",
];

const RESERVATION_DATA_TABS: AccountTab[] = ["reservations", "reviews"];

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
      if (RESERVATION_DATA_TABS.includes(tab)) {
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
    if (RESERVATION_DATA_TABS.includes(activeTab)) return;
    if (reservationsAttempted) return;
    loadReservations();
  }, [profile, activeTab, reservationsAttempted, loadReservations]);

  useEffect(() => {
    if (!RESERVATION_DATA_TABS.includes(activeTab) || reservationsAttempted) return;
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
    { key: "reservations", label: "Mis reservas" },
    { key: "reviews", label: "Mis reseñas" },
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

  const providerReservationStats = {
    total: reservationsProvider.length,
    completed: reservationsProvider.filter((r) => r.status === "completed").length,
    active: reservationsProvider.filter((r) => r.status === "pending" || r.status === "confirmed").length,
    cancelled: reservationsProvider.filter((r) => r.status === "cancelled_by_client" || r.status === "cancelled_by_provider").length,
  };

  const providerCompletionPercent = providerReservationStats.total
    ? Math.round((providerReservationStats.completed / providerReservationStats.total) * 100)
    : 0;

  const myReviews = reservationsClient
    .filter((reservation): reservation is Reservation & { review: ReservationReview } => Boolean(reservation.review))
    .sort((a, b) => new Date(b.review.created_at).getTime() - new Date(a.review.created_at).getTime());

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

          {activeTab === "reviews" && (
            <div className="card account-card">
              <div className="account-card__header">
                <div>
                  <h2 className="h2">Mis reseñas</h2>
                  <p className="muted">Repasá lo que opinaste sobre los servicios que reservaste.</p>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={loadReservations}
                  disabled={reservationsLoading}
                >
                  {reservationsLoading ? "Actualizando…" : "Actualizar"}
                </button>
              </div>
              <div className="account-card__content" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reservationsError && (
                  <div className="alert alert--error">
                    {reservationsError}
                    <button type="button" className="btn btn--ghost" onClick={loadReservations} style={{ marginLeft: "auto" }}>
                      Reintentar
                    </button>
                  </div>
                )}
                {reservationsLoading && myReviews.length === 0 ? (
                  <p className="muted">Cargando reseñas…</p>
                ) : myReviews.length === 0 ? (
                  <p className="muted">Todavía no dejaste reseñas. Cuando completes un servicio podrás calificarlo.</p>
                ) : (
                  <ul
                    className="reviews-feed"
                    style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}
                  >
                    {myReviews.map((reservation) => {
                      const service = servicesCache[reservation.service_id];
                      const serviceTitle = service?.title ?? `Servicio #${reservation.service_id}`;
                      const reviewCreatedAt = new Date(reservation.review.created_at).toLocaleDateString();
                      const reservationDate = new Date(reservation.reservation_datetime).toLocaleString();
                      return (
                        <li
                          key={reservation.review.id}
                          className="review-feed-item"
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 14,
                            padding: 16,
                            background: "#f9fbff",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          <div className="review-block__header">
                            <div>
                              <div className="service-title" style={{ fontSize: 18 }}>{serviceTitle}</div>
                              <p className="muted-small">Reseña creada el {reviewCreatedAt}</p>
                            </div>
                            <span className="review-stars">
                              {"★".repeat(reservation.review.rating)}
                              {"☆".repeat(5 - reservation.review.rating)}
                            </span>
                          </div>
                          {reservation.review.comment ? (
                            <p className="review-comment" style={{ marginBottom: 0 }}>{reservation.review.comment}</p>
                          ) : (
                            <p className="muted-small">Sin comentario.</p>
                          )}
                          <div
                            className="review-feed-item__meta"
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 12,
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span className="muted-small">Reserva programada para {reservationDate}</span>
                            <Link className="btn btn--ghost" to={`/services/${reservation.service_id}`}>
                              Ver servicio
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === "providers" && (
            <div className="card account-card">
              {isProvider ? (
                <div className="provider-dashboard">
                  <div className="provider-dashboard__top">
                    <div>
                      <h2 className="h2">Panel de proveedor</h2>
                      <p className="muted">Seguimiento en tiempo real de tus servicios, reservas e ingresos.</p>
                    </div>
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
                  <div className="provider-dashboard__stat-grid">
                    <div className="provider-dashboard__stat-card">
                      <span className="muted-small">Servicios publicados</span>
                      <strong>{providerTotals.servicesPublished}</strong>
                    </div>
                    <div className="provider-dashboard__stat-card">
                      <span className="muted-small">Reservas totales</span>
                      <strong>{providerTotals.reservationsTotal}</strong>
                    </div>
                    <div className="provider-dashboard__stat-card">
                      <span className="muted-small">Reservas completadas</span>
                      <strong>{providerTotals.reservationsCompleted}</strong>
                    </div>
                    <div className="provider-dashboard__stat-card">
                      <span className="muted-small">Favoritos</span>
                      <strong>{providerTotals.favoritesCount}</strong>
                    </div>
                  </div>
                  <div className="provider-dashboard__visuals">
                    <div className="provider-dashboard__card provider-dashboard__card--donut">
                      <CompletionDonut completed={providerReservationStats.completed} total={providerReservationStats.total} />
                      <div>
                        <h3 className="h3" style={{ marginBottom: 6 }}>Ratio de cumplimiento</h3>
                        <p className="muted">
                          {providerReservationStats.total === 0
                            ? "Todavía no recibiste reservas para medir este indicador."
                            : `${providerCompletionPercent}% de tus reservas terminaron correctamente.`}
                        </p>
                        <p className="muted-small">Completaste {providerReservationStats.completed} de {providerReservationStats.total} reservas asignadas.</p>
                      </div>
                    </div>
                    <div className="provider-dashboard__card">
                      <h3 className="h3" style={{ marginBottom: 12 }}>Estado de mis reservas</h3>
                      <StatusBreakdown
                        total={providerReservationStats.total}
                        stats={[
                          { label: "Activas", count: providerReservationStats.active, color: "#2563eb" },
                          { label: "Completadas", count: providerReservationStats.completed, color: "#22c55e" },
                          { label: "Canceladas", count: providerReservationStats.cancelled, color: "#f97316" },
                        ]}
                      />
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
                  <div className="provider-dashboard__split">
                    <div className="provider-dashboard__card">
                      <h3 className="h3">Reputación</h3>
                      <p className="muted" style={{ fontSize: 32, margin: "12px 0" }}>
                        {providerRatings.count ? providerRatings.average.toFixed(1) : "—"}
                        <span style={{ fontSize: 18, marginLeft: 8 }}>★</span>
                      </p>
                      <p className="muted-small">{providerRatings.count} reseñas recibidas.</p>
                    </div>
                    <div className="provider-dashboard__card">
                      <h3 className="h3">Ingresos estimados</h3>
                      <p style={{ fontSize: 32, fontWeight: 700, margin: "12px 0" }}>
                        {providerRevenue.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {providerRevenue.currency}
                      </p>
                      <p className="muted-small">Total acumulado en la plataforma.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ marginTop: 16 }}>
                  <h2 className="h2">Conviértete en proveedor</h2>
                  <p>¿Querés publicar servicios? Completa tu información fiscal y activa tu perfil.</p>
                  <Link className="btn btn--primary" to="/become-provider">Quiero ser proveedor</Link>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </section>
  );
}

type CompletionDonutProps = {
  completed: number;
  total: number;
};

function CompletionDonut({ completed, total }: CompletionDonutProps) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(completed / total, 1) : 0;
  const dashOffset = circumference - progress * circumference;
  const percentLabel = total > 0 ? `${Math.round(progress * 100)}%` : "0%";

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 160 160" className="donut-chart__svg">
        <circle cx="80" cy="80" r={radius} className="donut-chart__track" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          className="donut-chart__indicator"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="donut-chart__value">{percentLabel}</span>
    </div>
  );
}

type StatusBreakdownProps = {
  total: number;
  stats: Array<{ label: string; count: number; color: string }>;
};

function StatusBreakdown({ total, stats }: StatusBreakdownProps) {
  if (!total) {
    return <p className="muted">Aún no recibiste reservas.</p>;
  }

  return (
    <div className="status-breakdown">
      {stats.map((stat) => {
        const percent = total ? Math.round((stat.count / total) * 100) : 0;
        return (
          <div key={stat.label} className="status-breakdown__row">
            <div className="status-breakdown__label">
              <span className="status-breakdown__dot" style={{ background: stat.color }} />
              <span>{stat.label}</span>
              <span className="muted-small">{stat.count}</span>
            </div>
            <div className="status-breakdown__bar">
              <div className="status-breakdown__bar-fill" style={{ width: `${percent}%`, background: stat.color }} />
            </div>
            <span className="status-breakdown__percent">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}
