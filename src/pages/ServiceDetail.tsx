import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getService, listServiceImages, listServiceSchedule } from "../services/services";
import type { Service, ServiceImage, ServiceSchedule } from "../services/services";

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

    </section>
  );
}
