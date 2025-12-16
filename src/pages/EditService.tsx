import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listCategories, getService, updateService, listServiceImages, setServiceImages, listServiceSchedule, setServiceSchedule } from "../services/services";
import type { Category, Service, ServiceImage, ServiceSchedule } from "../services/services";
import { isInvalidDateRange, toDateInputValue } from "../utils/dates";

type EditableService = Service & {
  availability_start_date?: string | null;
  availability_end_date?: string | null;
};

export default function EditService() {
  const { id } = useParams();
  const serviceId = Number(id);
  const nav = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [svc, setSvc] = useState<Service | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState("ARS");
  const [durationMin, setDurationMin] = useState<number>(60);
  const [indefinite, setIndefinite] = useState(false);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [areaType, setAreaType] = useState("PRESENCIAL");
  const [radiusKm, setRadiusKm] = useState<number | ''>('');
  const [priceToAgree, setPriceToAgree] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [schedule, setSchedule] = useState<ServiceSchedule[]>([]);
  const [availabilityStart, setAvailabilityStart] = useState<string | ''>('');
  const [availabilityEnd, setAvailabilityEnd] = useState<string | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cats, s, imgs, sch] = await Promise.all([
          listCategories(),
          getService(serviceId),
          listServiceImages(serviceId).catch(()=>[]),
          listServiceSchedule(serviceId).catch(()=>[]),
        ]);
        setCategories(cats);
        setSvc(s);
        setTitle(s.title); setDescription(s.description); setPrice(s.price); setCurrency(s.currency);
        setDurationMin(s.duration_min || 0); setIndefinite(s.duration_min === 0); setCategoryId(s.category_id);
        setAreaType(s.area_type);
        setRadiusKm(typeof s.radius_km === "number" ? s.radius_km : '');
        setPriceToAgree(s.price_to_agree);
        setLocationNote(s.location_note ?? '');
        const svcWithAvailability = s as EditableService;
        setAvailabilityStart(toDateInputValue(svcWithAvailability.availability_start_date));
        setAvailabilityEnd(toDateInputValue(svcWithAvailability.availability_end_date));
        setImages(imgs); setSchedule(sch);
      } catch (e) {
        const message = e instanceof Error ? e.message : "No se pudieron cargar los datos del servicio.";
        setLoadError(message);
      }
      finally { setLoading(false); }
    })();
  }, [serviceId]);

  function addImage() { setImages(prev => [...prev, { url: "", is_cover: prev.length===0, sort_order: prev.length }]); }
  function updateImage(idx: number, patch: Partial<ServiceImage>) { setImages(prev => prev.map((img,i)=> i===idx? { ...img, ...patch }: img)); }
  function setCover(idx: number) { setImages(prev => prev.map((img,i)=> ({ ...img, is_cover: i===idx })) ); }
  function removeImage(idx: number) { setImages(prev => prev.filter((_,i)=>i!==idx)); }
  function addSlot() { setSchedule(prev => [...prev, { weekday: 0, time_from: "09:00", time_to: "12:00" }]); }
  function updateSlot(idx: number, patch: Partial<ServiceSchedule>) { setSchedule(prev => prev.map((s,i)=> i===idx? { ...s, ...patch }: s)); }
  function removeSlot(idx: number) { setSchedule(prev => prev.filter((_,i)=>i!==idx)); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError(null); setSaving(true);
    try {
      if (!svc) return;
      // validate availability
      if (isInvalidDateRange(availabilityStart, availabilityEnd)) {
        throw new Error("La fecha de inicio de disponibilidad no puede ser posterior a la de fin.");
      }
      if (!title.trim()) throw new Error("Título requerido");
      if (!description.trim()) throw new Error("Descripción requerida");
      if (!categoryId) throw new Error("Seleccioná categoría");
  if (!priceToAgree && price <= 0) throw new Error("Precio > 0 o marcar 'a convenir'");
  if (!indefinite && durationMin <= 0) throw new Error("Duración inválida");
  if (areaType === 'PERSONALIZADO' && !locationNote.trim()) throw new Error("Nota ubicación requerida");
      if (images.filter(i=>i.is_cover).length>1) throw new Error("Solo una portada");
      if (schedule.some(s=> s.weekday<0 || s.weekday>6 || s.time_from>=s.time_to)) throw new Error("Horario inválido");

  const payload: Record<string, unknown> = {
        category_id: Number(categoryId),
        title,
        description,
        currency,
        area_type: areaType,
        price_to_agree: priceToAgree,
        duration_min: indefinite ? 0 : durationMin,
       availability_start_date: availabilityStart || undefined,
       availability_end_date: availabilityEnd || undefined,
      };
      if (!priceToAgree) payload.price = price;
      if (areaType === 'PERSONALIZADO') payload.location_note = locationNote.trim();
      if (areaType === 'PRESENCIAL' && radiusKm !== '') payload.radius_km = Number(radiusKm);
      await updateService(svc.id, payload);
      await setServiceImages(svc.id, images);
      await setServiceSchedule(svc.id, schedule);
      nav(`/services/${svc.id}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar el servicio.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container"><p className="muted">Cargando…</p></div>;
  if (loadError) return <div className="container"><p style={{color:'#b00020'}}>{loadError}</p></div>;

  return (
    <section className="section service-editor">
      <div className="container">
        <div className="service-editor__intro">
          <div>
            <p className="service-form__tagline">Actualización</p>
            <h1 className="h2">Editar servicio</h1>
            <p className="muted">Organizamos los campos en bloques claros para que puedas ajustar todo sin perderte.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="card service-form">
          <div className="service-form__section">
            <div className="service-form__section-head">
              <div>
                <p className="service-form__tagline">Identidad</p>
                <h3>Información principal</h3>
              </div>
            </div>
            <div className="service-form__grid">
              <div className="form-field">
                <label className="label">Categoría</label>
                <select value={categoryId} onChange={e=>setCategoryId(e.target.value? Number(e.target.value): '')} required>
                  <option value="">-- Selecciona --</option>
                  {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="label">Título</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} required />
              </div>
              <div className="form-field">
                <label className="label">Disponibilidad desde</label>
                <input type="date" value={availabilityStart} onChange={e=>setAvailabilityStart(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="label">Disponibilidad hasta</label>
                <input type="date" value={availabilityEnd} onChange={e=>setAvailabilityEnd(e.target.value)} />
              </div>
              <div className="form-field full-width">
                <label className="label">Descripción</label>
                <textarea value={description} onChange={e=>setDescription(e.target.value)} required />
              </div>
            </div>
          </div>

          <div className="service-form__section">
            <div className="service-form__section-head">
              <div>
                <p className="service-form__tagline">Precio y duración</p>
                <h3>Condiciones comerciales</h3>
              </div>
            </div>
            <div className="service-form__grid">
              <div className="form-field">
                <label className="label">Precio</label>
                <input type="number" min={0} disabled={priceToAgree} value={price} onChange={e=>setPrice(Number(e.target.value))} />
                <label className="service-form__inline">
                  <input type="checkbox" checked={priceToAgree} onChange={e=> { setPriceToAgree(e.target.checked); if (e.target.checked) setPrice(0); }} />
                  <span>Precio a convenir</span>
                </label>
              </div>
              <div className="form-field">
                <label className="label">Moneda</label>
                <select value={currency} onChange={e=>setCurrency(e.target.value)}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="form-field">
                <label className="label">Duración (min)</label>
                <input type="number" min={1} disabled={indefinite} value={durationMin} onChange={e=>setDurationMin(Number(e.target.value))} />
                <label className="service-form__inline">
                  <input type="checkbox" checked={indefinite} onChange={e=> { setIndefinite(e.target.checked); if (e.target.checked) setDurationMin(0); }} />
                  <span>Duración indefinida</span>
                </label>
              </div>
            </div>
          </div>

          <div className="service-form__section">
            <div className="service-form__section-head">
              <div>
                <p className="service-form__tagline">Modalidad</p>
                <h3>Dónde trabajás</h3>
              </div>
            </div>
            <div className="service-form__grid">
              <div className="form-field">
                <label className="label">Localización</label>
                <select value={areaType} onChange={e=>setAreaType(e.target.value)}>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="REMOTO">Remoto</option>
                  <option value="PERSONALIZADO">Personalizado</option>
                  <option value="CUSTOMER_LOCATION">(Legacy) Cliente</option>
                  <option value="PROVIDER_LOCATION">(Legacy) Proveedor</option>
                </select>
              </div>
              {areaType === 'PRESENCIAL' && (
                <div className="form-field">
                  <label className="label">Radio (km) opcional</label>
                  <input type="number" min={0} value={radiusKm} onChange={e=>setRadiusKm(e.target.value===''? '': Number(e.target.value))} />
                </div>
              )}
              {areaType === 'PERSONALIZADO' && (
                <div className="form-field full-width">
                  <label className="label">Nota ubicación</label>
                  <input value={locationNote} onChange={e=> setLocationNote(e.target.value)} placeholder="Ej: Rosario zona sur" />
                </div>
              )}
            </div>
          </div>

          <div className="service-form__section">
            <div className="service-form__section-head">
              <div>
                <p className="service-form__tagline">Presentación</p>
                <h3>Galería</h3>
              </div>
              <button type="button" className="btn btn--ghost" onClick={addImage}>+ Imagen</button>
            </div>
            <div className="service-form__list">
              {!images.length && <p className="muted">Todavía no agregaste imágenes. Sumá al menos una portada para destacar.</p>}
              {images.map((img,i)=> (
                <div key={i} className="service-form__list-row">
                  <div className="form-field">
                    <label className="label">URL</label>
                    <input placeholder="https://" value={img.url} onChange={e=>updateImage(i,{url:e.target.value})} />
                  </div>
                  <label className="service-form__inline">
                    <input type="radio" checked={!!img.is_cover} onChange={()=>setCover(i)} />
                    <span>Portada</span>
                  </label>
                  <button type="button" className="btn btn--ghost" onClick={()=>removeImage(i)}>Eliminar</button>
                </div>
              ))}
            </div>
          </div>

          <div className="service-form__section">
            <div className="service-form__section-head">
              <div>
                <p className="service-form__tagline">Disponibilidad</p>
                <h3>Horarios</h3>
              </div>
              <button type="button" className="btn btn--ghost" onClick={addSlot}>+ Horario</button>
            </div>
            <div className="service-form__list">
              {!schedule.length && <p className="muted">Definí franjas para que los clientes sepan cuándo reservar.</p>}
              {schedule.map((s,i)=> (
                <div key={i} className="service-form__list-row schedule-row">
                  <select value={s.weekday} onChange={e=>updateSlot(i,{weekday:Number(e.target.value)})}>
                    <option value={0}>Lun</option>
                    <option value={1}>Mar</option>
                    <option value={2}>Mié</option>
                    <option value={3}>Jue</option>
                    <option value={4}>Vie</option>
                    <option value={5}>Sáb</option>
                    <option value={6}>Dom</option>
                  </select>
                  <input type="time" value={s.time_from} onChange={e=>updateSlot(i,{time_from:e.target.value})} />
                  <input type="time" value={s.time_to} onChange={e=>updateSlot(i,{time_to:e.target.value})} />
                  <button type="button" className="btn btn--ghost" onClick={()=>removeSlot(i)}>Eliminar</button>
                </div>
              ))}
            </div>
          </div>

          {formError && <div className="muted" style={{color:'#b00020'}}>{formError}</div>}
          <div className="service-form__actions">
            <p className="service-form__tagline">Guardá los cambios para actualizar el servicio en la tienda.</p>
            <button className="btn btn--primary" disabled={saving}>{saving? 'Guardando...':'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
