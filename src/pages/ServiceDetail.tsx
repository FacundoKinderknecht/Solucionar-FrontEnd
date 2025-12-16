import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getService, listServiceImages, listServiceSchedule } from "../services/services";
import type { Service, ServiceImage, ServiceSchedule } from "../services/services";
import { createPayment } from "../services/payments";
import { getToken } from "../services/api";

const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

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
  const contactHref = `mailto:contacto@solucion.ar?subject=${encodeURIComponent(`Consulta sobre ${svc.title}`)}`;
  const formatTimezone = (tz?: string | null) => {
    if (!tz) return "Zona horaria local";
    const friendly = tz.split("/").pop()?.replaceAll("_", " ");
    return friendly || tz;
  };

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

        <aside className="service-detail__side card">
          <h3 className="h3">Disponibilidad</h3>
          {schedule.length>0 ? (
            <ul className="service-detail__schedule">
              {schedule.map((slot) => (
                <li key={`${slot.weekday}-${slot.time_from}`}>
                  <span className="schedule-day">{WEEKDAY_LABELS[slot.weekday] || `Día ${slot.weekday}`}</span>
                  <span className="schedule-time">{slot.time_from} - {slot.time_to}</span>
                  <span className="schedule-tz" title={slot.timezone ?? undefined}>
                    {formatTimezone(slot.timezone)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sin horarios cargados.</p>
          )}
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

    </section>
  );
}

  // --- component helpers and additional state ---
