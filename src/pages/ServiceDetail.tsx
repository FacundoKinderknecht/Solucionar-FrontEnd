import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { bookService, getService, listServiceImages, listServiceSchedule, listServiceReviews, type ReservationReview } from "../services/services";
import { getMyProvider } from "../services/auth";
import type { Service, ServiceImage, ServiceSchedule } from "../services/services";
import { createPayment } from "../services/payments";
import { backendWeekdayToJs, isDateWithinRange, toDateInputValue } from "../utils/dates";
import { getToken } from "../services/api";

type NormalizedSlot = ServiceSchedule & { weekdayJs: number };
const RATING_FILTERS = [5, 4, 3, 2, 1];

const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function getWeekdayFromInput(value: string): number | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).getDay();
}

export default function ServiceDetail() {
  const { id } = useParams();
  const serviceId = Number(id);
  const [svc, setSvc] = useState<Service | null>(null);
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [schedule, setSchedule] = useState<ServiceSchedule[]>([]);
  const [showReserve, setShowReserve] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [ownsService, setOwnsService] = useState(false);
  const [reviews, setReviews] = useState<ReservationReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const availabilityStart = svc?.availability_start_date ? toDateInputValue(svc.availability_start_date) : null;
  const availabilityEnd = svc?.availability_end_date ? toDateInputValue(svc.availability_end_date) : null;
  const normalizedSlots = useMemo<NormalizedSlot[]>(
    () =>
      schedule.map((slot) => ({
        ...slot,
        weekdayJs: backendWeekdayToJs(slot.weekday),
      })),
    [schedule],
  );
  const ratingBreakdown = useMemo(() => {
    const base: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((entry) => {
      base[entry.rating] = (base[entry.rating] ?? 0) + 1;
    });
    return base;
  }, [reviews]);
  const totalReviews = reviews.length;
  const averageRating = useMemo(() => {
    if (!totalReviews) return null;
    const total = reviews.reduce((acc, entry) => acc + entry.rating, 0);
    return total / totalReviews;
  }, [reviews, totalReviews]);
  const filteredReviews = useMemo(() => {
    if (!ratingFilter) return reviews;
    return reviews.filter((entry) => entry.rating === ratingFilter);
  }, [reviews, ratingFilter]);

  useEffect(() => {
    if (!serviceId) return;
    (async () => {
      try {
        const [s, imgs, sch] = await Promise.all([
          getService(serviceId),
          listServiceImages(serviceId).catch(()=>[]),
          listServiceSchedule(serviceId).catch(()=>[]),
        ]);
        setSvc(s); setImages(imgs); setSchedule(sch);
      } catch (e) { setErr((e as Error).message); }
    })();
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId) return;
    setReviewsLoading(true);
    setReviewsError(null);
    listServiceReviews(serviceId)
      .then(setReviews)
      .catch((error) => setReviewsError((error as Error).message))
      .finally(() => setReviewsLoading(false));
  }, [serviceId]);

  const dayOptions = useMemo(() => {
    if (!normalizedSlots.length) return [] as { value: string; label: string; display: string; weekday: number }[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = availabilityStart ? new Date(`${availabilityStart}T00:00:00`) : today;
    const effectiveStart = startDate > today ? startDate : today;
    const endDate = availabilityEnd
      ? new Date(`${availabilityEnd}T23:59:59`)
      : new Date(effectiveStart.getTime() + 90 * 24 * 60 * 60 * 1000);
    if (endDate < effectiveStart) return [];
    const dayCount = Math.min(120, Math.floor((endDate.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const options: { value: string; label: string; display: string; weekday: number }[] = [];
    for (let i = 0; i < dayCount; i += 1) {
      const candidate = new Date(effectiveStart);
      candidate.setDate(effectiveStart.getDate() + i);
      const weekday = candidate.getDay();
      if (!normalizedSlots.some((slot) => slot.weekdayJs === weekday)) continue;
      const value = candidate.toISOString().split("T")[0];
      if (!isDateWithinRange(value, availabilityStart, availabilityEnd)) continue;
      options.push({
        value,
        label: WEEKDAY_LABELS[weekday] ?? `Día ${weekday}`,
        display: candidate.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
        weekday,
      });
    }
    return options;
  }, [normalizedSlots, availabilityStart, availabilityEnd]);

  useEffect(() => {
    if (!dayOptions.length) {
      if (selectedDate) setSelectedDate("");
      return;
    }
    if (!selectedDate || !dayOptions.some((day) => day.value === selectedDate)) {
      setSelectedDate(dayOptions[0].value);
    }
  }, [dayOptions, selectedDate]);

  const slotsForSelectedDay = useMemo<NormalizedSlot[]>(() => {
    const weekday = getWeekdayFromInput(selectedDate);
    if (weekday === null) return [];
    return normalizedSlots.filter((slot) => slot.weekdayJs === weekday);
  }, [selectedDate, normalizedSlots]);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedSlot("");
      return;
    }
    if (!slotsForSelectedDay.length) {
      setSelectedSlot("");
      return;
    }
    if (!slotsForSelectedDay.some((slot) => slot.time_from === selectedSlot)) {
      setSelectedSlot("");
    }
  }, [selectedDate, slotsForSelectedDay, selectedSlot]);

  useEffect(() => {
    if (bookingError) setBookingError(null);
    if (bookingSuccess) setBookingSuccess(null);
  }, [selectedDate, selectedSlot]);

  useEffect(() => {
    if (!svc) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await getMyProvider();
        if (!cancelled) setOwnsService(Boolean(profile && profile.id === svc.provider_id));
      } catch {
        if (!cancelled) setOwnsService(false);
      }
    })();
    return () => { cancelled = true; };
  }, [svc?.provider_id]);
  useEffect(()=>{
    if (!selectedDate) { setAvailableTimes([]); return; }
    const d = new Date(selectedDate + 'T00:00:00');
    const wk = d.getDay();
    const slots = schedule.filter(s=>s.weekday === wk);
    const times: string[] = [];
    const toMinutes = (t:string)=>{ const [hh,mm]=t.split(':').map(Number); return hh*60+mm; };
    const fromMinutesToStr = (m:number)=>{ const hh = Math.floor(m/60).toString().padStart(2,'0'); const mm = (m%60).toString().padStart(2,'0'); return `${hh}:${mm}`; };
    for (const s of slots) {
      const start = toMinutes(s.time_from);
      const end = toMinutes(s.time_to);
      for (let m = start; m + 15 <= end; m += 30) { // 30-min steps
        times.push(fromMinutesToStr(m));
      }
    }
    setAvailableTimes(times);
  }, [selectedDate, schedule]);

  if (err) return <div className="container"><div className="muted" style={{color:'#b00020'}}>{err}</div></div>;
  if (!svc) return <div className="container"><div className="muted">Cargando…</div></div>;

  const cover = images.find((img) => img.is_cover)?.url || images[0]?.url;
  const priceLabel = svc.price_to_agree
    ? "Precio a convenir"
    : `${svc.currency} ${svc.price.toLocaleString()}`;
  const durationLabel = svc.duration_min === 0 ? "Duración indefinida" : `${svc.duration_min} min`;
  const areaLabel = svc.area_type.replaceAll("_", " ");
  const formatTimezone = (tz?: string | null) => {
    if (!tz) return "Zona horaria local";
    const friendly = tz.split("/").pop()?.replaceAll("_", " ");
    return friendly || tz;
  };
  const bookingDisabled = !selectedDate || !selectedSlot || bookingLoading || ownsService;

  async function handleBooking() {
    if (!serviceId) return;
    if (!selectedDate) {
      setBookingError("Elegí una fecha disponible.");
      return;
    }
    if (!selectedSlot) {
      setBookingError("Elegí un horario disponible.");
      return;
    }
    if (ownsService) {
      setBookingError("No podés reservar tu propio servicio.");
      return;
    }
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);
    try {
      const reservationIso = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString();
      await bookService(serviceId, reservationIso, notes.trim() ? notes.trim() : undefined);
      setBookingSuccess("Reserva creada. Te avisaremos cuando el proveedor la confirme.");
      setNotes("");
    } catch (error) {
      setBookingError((error as Error).message);
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <section className="section service-detail">
      <div className="container service-detail__grid">
        <div className="card service-detail__hero">
          {cover && (
            <div className="service-detail__cover">
              <img src={cover} alt="Portada del servicio" />
            </div>
          )}
          <div className="service-detail__header">
            <span className="chip chip--muted">{areaLabel}</span>
            <h1>{svc.title}</h1>
            <p className="muted">{svc.location_note || "Servicio disponible en tu zona"}</p>
            <div className="service-detail__rating-badge">
              <span>
                <span style={{ color: "#f59e0b", marginRight: 6 }}>★</span>
                {averageRating ? `${averageRating.toFixed(1)} / 5` : "Sin reseñas"}
              </span>
              {totalReviews > 0 && <span className="muted-small">{totalReviews} reseñas</span>}
            </div>
          </div>
          <div className="service-detail__stats">
            <div>
              <span className="label">Precio</span>
              <strong>{priceLabel}</strong>
            </div>
            <div>
              <span className="label">Duración</span>
              <strong>{durationLabel}</strong>
            </div>
            <div>
              <span className="label">Estado</span>
              <span className={`chip ${svc.active ? "chip--success" : "chip--muted"}`}>
                {svc.active ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
          <p className="service-detail__description">{svc.description}</p>
          <div className="service-detail__actions">
            <a className="btn btn--primary" href={contactHref}>Contactar proveedor</a>
            <button className="btn btn--primary" onClick={async()=>{
              const token = getToken();
              if (!token) { window.location.href = '/login'; return; }
              // open reservation picker
              setShowReserve(true);
            }}>Reservar</button>
            <a className="btn btn--ghost" href={`/services/${svc.id}/edit`}>Editar</a>
          </div>
        </div>

        <aside className="service-detail__side">
          <div className="card availability-panel">
            <div className="availability-panel__head">
              <h3 className="h3">Disponibilidad</h3>
              <p className="muted-small">Elegí día y horario antes de confirmar.</p>
            </div>
            {ownsService ? (
              <p className="muted">No podés reservar tu propio servicio. Compartilo con tus clientes.</p>
            ) : schedule.length === 0 ? (
              <p className="muted">El proveedor todavía no cargó horarios disponibles.</p>
            ) : (
              <>
                <label className="form-field availability-select" htmlFor="day-select">
                  <span>Día disponible</span>
                  <select
                    id="day-select"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  >
                    {dayOptions.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label} · {day.display}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="slot-grid">
                  {slotsForSelectedDay.length === 0 && (
                    <p className="muted">Sin horarios para este día.</p>
                  )}
                  {slotsForSelectedDay.map((slot) => (
                    <button
                      key={`${slot.weekday}-${slot.time_from}`}
                      type="button"
                      className={`slot-button ${selectedSlot === slot.time_from ? "slot-button--active" : ""}`}
                      onClick={() => setSelectedSlot(slot.time_from)}
                    >
                      <strong>{slot.time_from} - {slot.time_to}</strong>
                      <span>{formatTimezone(slot.timezone)}</span>
                    </button>
                  ))}
                </div>
                <label className="form-field availability-note" htmlFor="booking-notes">
                  <span>Notas para el proveedor</span>
                  <textarea
                    id="booking-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalles adicionales, acceso al domicilio, referencias, etc."
                  />
                </label>
                {bookingError && (
                  <div className="availability-feedback availability-feedback--error">{bookingError}</div>
                )}
                {bookingSuccess && (
                  <div className="availability-feedback availability-feedback--success">{bookingSuccess}</div>
                )}
                <button
                  type="button"
                  className="btn btn--primary availability-cta"
                  disabled={bookingDisabled || !slotsForSelectedDay.length}
                  onClick={handleBooking}
                >
                  {bookingLoading ? "Reservando…" : "Confirmar reserva"}
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
        {/* Reservation modal (simple) */}
        {showReserve && (
          <div className="modal">
            <div className="modal__content card">
              <h3>Reservar {svc.title}</h3>
              <div>
                <label>Fecha</label>
                <input type="date" value={selectedDate} onChange={(e)=>{ setSelectedDate(e.target.value); setSelectedTime(''); }} min={svc.availability_start_date ?? undefined} max={svc.availability_end_date ?? undefined} />
              </div>
              <div style={{marginTop:8}}>
                <label>Horario disponible</label>
                {selectedDate ? (
                  availableTimes.length>0 ? (
                    <select value={selectedTime} onChange={(e)=>setSelectedTime(e.target.value)}>
                      <option value="">-- elegir --</option>
                      {availableTimes.map(t=> <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : <div className="muted">No hay horarios para esa fecha.</div>
                ) : <div className="muted">Seleccioná una fecha para ver horarios.</div>}
              </div>
              <div style={{marginTop:12}}>
                <label>Notas (opcional)</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}></textarea>
              </div>
              <div style={{marginTop:12}}>
                <button className="btn btn--primary" onClick={async()=>{
                  if (!selectedDate || !selectedTime) return alert('Seleccioná fecha y horario');
                  try {
                    const reservation_datetime = `${selectedDate}T${selectedTime}:00`;
                    const params = new URLSearchParams();
                    params.append('service_id', String(svc.id));
                    params.append('reservation_datetime', reservation_datetime);
                    if (!svc.price_to_agree) { params.append('monto', String(svc.price)); params.append('moneda', svc.currency); }
                    if (notes) params.append('notes', notes);
                    // navigate to payment creation page where user selects gateway
                    window.location.href = `/payments/new?${params.toString()}`;
                  } catch (e) { alert((e as Error).message); }
                }}>Confirmar y pagar</button>
                <button className="btn btn--ghost" onClick={()=>setShowReserve(false)} style={{marginLeft:8}}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

      <div className="container service-reviews-container">
        <div className="card service-reviews-card">
            <div className="service-reviews-card__header">
              <div>
                <h3 className="h3">Reseñas de clientes</h3>
                <p className="muted-small">
                  {totalReviews > 0 ? "Elegí una calificación para filtrar comentarios." : "Aún no hay reseñas para este servicio."}
                </p>
              </div>
              <div className="review-filters">
                <button
                  type="button"
                  className={`review-filter-btn ${ratingFilter === null ? "review-filter-btn--active" : ""}`}
                  onClick={() => setRatingFilter(null)}
                >
                  Todas ({totalReviews})
                </button>
                {RATING_FILTERS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`review-filter-btn ${ratingFilter === value ? "review-filter-btn--active" : ""}`}
                    onClick={() => setRatingFilter(value)}
                    disabled={!ratingBreakdown[value]}
                  >
                    {value}★ ({ratingBreakdown[value] || 0})
                  </button>
                ))}
              </div>
            </div>
            {reviewsError && <p className="review-form__error">{reviewsError}</p>}
            {reviewsLoading ? (
              <p className="muted">Cargando reseñas...</p>
            ) : filteredReviews.length === 0 ? (
              <p className="muted">No hay reseñas con esta calificación.</p>
            ) : (
              <ul className="service-review-list">
                {filteredReviews.map((review) => (
                  <li key={review.id} className="service-review-item">
                    <div className="service-review-item__header">
                      <span className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                      <span className="muted-small">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    {review.comment ? (
                      <p className="service-review-item__comment">{review.comment}</p>
                    ) : (
                      <p className="muted-small">Sin comentario.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

    </section>
  );
}

  // --- component helpers and additional state ---
