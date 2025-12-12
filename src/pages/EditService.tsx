import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listCategories, getService, updateService, listServiceImages, setServiceImages, listServiceSchedule, setServiceSchedule } from "../services/services";
import type { Category, Service, ServiceImage, ServiceSchedule } from "../services/services";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
  setPriceToAgree(s.price_to_agree);
  setLocationNote(s.location_note ?? '');
        setImages(imgs); setSchedule(sch);
      } catch (e) { setErr((e as Error).message); }
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
    e.preventDefault(); setErr(null); setSaving(true);
    try {
      if (!svc) return;
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
      };
      if (!priceToAgree) payload.price = price;
      if (areaType === 'PERSONALIZADO') payload.location_note = locationNote.trim();
      if (areaType === 'PRESENCIAL' && radiusKm !== '') payload.radius_km = Number(radiusKm);
      await updateService(svc.id, payload);
      await setServiceImages(svc.id, images);
      await setServiceSchedule(svc.id, schedule);
      nav(`/services/${svc.id}`);
    } catch (e) { setErr((e as Error).message); } finally { setSaving(false); }
  }

  if (loading) return <div className="container"><p className="muted">Cargando…</p></div>;
  if (err) return <div className="container"><p style={{color:'#b00020'}}>{err}</p></div>;

  return (
    <section className="section">
      <div className="container">
        <h1 className="h2">Editar servicio</h1>
        <form onSubmit={onSubmit} className="card form">
          <div className="form-row">
            <label className="label">Categoría</label>
            <select value={categoryId} onChange={e=>setCategoryId(e.target.value? Number(e.target.value): '')} required>
              <option value="">-- Selecciona --</option>
              {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-row"><label className="label">Título</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} required /></div>
          <div className="form-row"><label className="label">Descripción</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5} required /></div>
          <div className="form-row" style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <div style={{flex:1}}><label className="label">Precio</label>
              <input type="number" min={0} disabled={priceToAgree} value={price} onChange={e=>setPrice(Number(e.target.value))} />
              <label style={{display:'flex', gap:4, marginTop:4}}>
                <input type="checkbox" checked={priceToAgree} onChange={e=> { setPriceToAgree(e.target.checked); if (e.target.checked) setPrice(0); }} /> a convenir
              </label>
            </div>
            <div><label className="label">Moneda</label>
              <select value={currency} onChange={e=>setCurrency(e.target.value)}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div><label className="label">Duración (min)</label>
              <input type="number" min={1} disabled={indefinite} value={durationMin} onChange={e=>setDurationMin(Number(e.target.value))} />
              <label style={{display:'flex', gap:4, marginTop:4}}>
                <input type="checkbox" checked={indefinite} onChange={e=> { setIndefinite(e.target.checked); if (e.target.checked) setDurationMin(0); }} /> indefinida
              </label>
            </div>
          </div>
          <div className="form-row" style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <div><label className="label">Localización</label>
              <select value={areaType} onChange={e=>setAreaType(e.target.value)}>
                <option value="PRESENCIAL">Presencial</option>
                <option value="REMOTO">Remoto</option>
                <option value="PERSONALIZADO">Personalizado</option>
                <option value="CUSTOMER_LOCATION">(Legacy) Cliente</option>
                <option value="PROVIDER_LOCATION">(Legacy) Proveedor</option>
              </select>
            </div>
            {areaType === 'PRESENCIAL' && (
              <div><label className="label">Radio (km) opcional</label>
                <input type="number" min={0} value={radiusKm} onChange={e=>setRadiusKm(e.target.value===''? '': Number(e.target.value))} />
              </div>
            )}
            {areaType === 'PERSONALIZADO' && (
              <div style={{flex:1}}>
                <label className="label">Nota ubicación</label>
                <input value={locationNote} onChange={e=> setLocationNote(e.target.value)} placeholder="Ej: Rosario zona sur" />
              </div>
            )}
          </div>

          <fieldset style={{marginTop:16}}>
            <legend className="label">Imágenes</legend>
            {images.map((img,i)=> (
              <div key={i} className="form-row" style={{display:'flex', gap:8, alignItems:'center'}}>
                <input style={{flex:1}} placeholder="URL" value={img.url} onChange={e=>updateImage(i,{url:e.target.value})} />
                <label style={{display:'flex', alignItems:'center', gap:4}}>
                  <input type="radio" checked={!!img.is_cover} onChange={()=>setCover(i)} /> Portada
                </label>
                <button type="button" className="btn btn--ghost" onClick={()=>removeImage(i)}>X</button>
              </div>
            ))}
            <button type="button" className="btn btn--ghost" onClick={addImage}>+ Imagen</button>
          </fieldset>

          <fieldset style={{marginTop:16}}>
            <legend className="label">Horarios</legend>
            {schedule.map((s,i)=> (
              <div key={i} className="form-row" style={{display:'flex', gap:8}}>
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
                <button type="button" className="btn btn--ghost" onClick={()=>removeSlot(i)}>X</button>
              </div>
            ))}
            <button type="button" className="btn btn--ghost" onClick={addSlot}>+ Horario</button>
          </fieldset>

          {err && <div className="muted" style={{color:'#b00020'}}>{err}</div>}
          <div className="actions">
            <button className="btn btn--primary" disabled={saving}>{saving? 'Guardando...':'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
