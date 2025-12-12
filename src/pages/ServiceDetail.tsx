import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getService, listServiceImages, listServiceSchedule } from "../services/services";
import type { Service, ServiceImage, ServiceSchedule } from "../services/services";

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

  return (
    <section className="section">
      <div className="container">
        <h1 className="h2">{svc.title}</h1>
        <div className="muted">
          {svc.price_to_agree ? 'Precio a convenir' : `${svc.currency} ${svc.price.toFixed(2)}`} • {svc.duration_min === 0 ? 'duración indefinida' : `${svc.duration_min} min`}
        </div>
        <div className="muted" style={{marginTop:4}}>
          {svc.area_type}
          {svc.location_note ? ` • ${svc.location_note}` : ''}
        </div>
        <p style={{marginTop:12}}>{svc.description}</p>
        <div style={{marginTop:12}}>
          <a className="btn btn--ghost" href={`/services/${svc.id}/edit`}>Editar</a>
        </div>

        {images.length>0 && (
          <div className="grid" style={{marginTop:16}}>
            {images.map(img => (
              <img key={img.url} src={img.url} alt="" style={{maxWidth:'100%', borderRadius:8}} />
            ))}
          </div>
        )}

        {schedule.length>0 && (
          <div style={{marginTop:16}}>
            <h3 className="h3">Disponibilidad</h3>
            <ul className="muted">
              {schedule.map(s => (
                <li key={`${s.weekday}-${s.time_from}`}>Día {s.weekday}: {s.time_from} - {s.time_to} ({s.timezone})</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
