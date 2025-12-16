import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCategories, createService } from "../services/services";
import { isInvalidDateRange } from "../utils/dates";
import type { Category, ServiceCreate } from "../services/services";

export default function CreateService() {
  const nav = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [priceToAgree, setPriceToAgree] = useState(false);
  const [currency, setCurrency] = useState('ARS');
  const [durationMin, setDurationMin] = useState<number | ''>('');
  const [indefinite, setIndefinite] = useState(true); // default indefinido => duration 0
  const [areaType, setAreaType] = useState('PRESENCIAL');
  const [locationNote, setLocationNote] = useState('');
  const [radiusKm, setRadiusKm] = useState<number | ''>('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [availabilityStart, setAvailabilityStart] = useState<string | ''>('');
  const [availabilityEnd, setAvailabilityEnd] = useState<string | ''>('');

  useEffect(() => { listCategories().then(setCategories).catch(()=> setErr('No se pudieron cargar categorías')).finally(()=> setLoadingCategories(false)); }, []);

  function resetForArea(newType: string) {
    setAreaType(newType);
    if (newType === 'PERSONALIZADO') {
      setRadiusKm('');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      // validate availability dates
      if (isInvalidDateRange(availabilityStart, availabilityEnd)) {
        throw new Error("La fecha de inicio de disponibilidad no puede ser posterior a la de fin.");
      }
      if (!categoryId) throw new Error('Seleccioná categoría');
      if (!title.trim()) throw new Error('Título requerido');
      if (!description.trim()) throw new Error('Descripción requerida');
      if (!priceToAgree && (price === '' || Number(price) <= 0)) throw new Error('Precio > 0 o marcar "a convenir"');
      if (!indefinite && (durationMin === '' || Number(durationMin) <= 0)) throw new Error('Duración inválida');
      if (areaType === 'PERSONALIZADO' && !locationNote.trim()) throw new Error('Nota de ubicación requerida para personalizado');

      const payload: ServiceCreate = {
        category_id: Number(categoryId),
        title: title.trim(),
        description: description.trim(),
        currency,
        area_type: areaType,
        price_to_agree: priceToAgree,
        duration_min: indefinite ? 0 : Number(durationMin),
        availability_start_date: availabilityStart || undefined,
        availability_end_date: availabilityEnd || undefined,
      };
      if (!priceToAgree) payload.price = Number(price);
      if (areaType === 'PERSONALIZADO') payload.location_note = locationNote.trim();
      if (areaType === 'PRESENCIAL' && radiusKm !== '') payload.radius_km = Number(radiusKm);

      setSaving(true);
      const created = await createService(payload);
      nav(`/services/${created.id}`);
    } catch (e) { setErr((e as Error).message); } finally { setSaving(false); }
  }

  return (
    <section className="section service-editor">
      <div className="container">
        <div className="service-editor__intro">
          <div>
            <p className="service-form__tagline">Nuevo servicio</p>
            <h1 className="h2">Crear servicio</h1>
            <p className="muted">Completá la información para publicar tu oferta con la mejor presentación posible.</p>
          </div>
        </div>
        <form className="card service-form" onSubmit={onSubmit}>
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
                <select value={categoryId} onChange={e=> setCategoryId(e.target.value? Number(e.target.value): '')} disabled={loadingCategories} required>
                  <option value="">-- Selecciona --</option>
                  {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="label">Título</label>
                <input value={title} onChange={e=> setTitle(e.target.value)} required />
              </div>
              <div className="form-field">
                <label className="label">Disponibilidad desde</label>
                <input type="date" value={availabilityStart} onChange={e=> setAvailabilityStart(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="label">Disponibilidad hasta</label>
                <input type="date" value={availabilityEnd} onChange={e=> setAvailabilityEnd(e.target.value)} />
              </div>
              <div className="form-field full-width">
                <label className="label">Descripción</label>
                <textarea value={description} onChange={e=> setDescription(e.target.value)} required />
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
                <input type="number" min={0} disabled={priceToAgree} value={price} onChange={e=> setPrice(e.target.value===''? '': Number(e.target.value))} />
                <label className="service-form__inline">
                  <input type="checkbox" checked={priceToAgree} onChange={e=> { setPriceToAgree(e.target.checked); if (e.target.checked) setPrice(''); }} />
                  <span>Precio a convenir</span>
                </label>
              </div>
              <div className="form-field">
                <label className="label">Moneda</label>
                <select value={currency} onChange={e=> setCurrency(e.target.value)}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="form-field">
                <label className="label">Duración (min)</label>
                <input type="number" min={1} disabled={indefinite} value={durationMin} onChange={e=> setDurationMin(e.target.value===''? '': Number(e.target.value))} />
                <label className="service-form__inline">
                  <input type="checkbox" checked={indefinite} onChange={e=> { setIndefinite(e.target.checked); if (e.target.checked) setDurationMin(''); }} />
                  <span>Duración indefinida</span>
                </label>
              </div>
            </div>
          </div>

          <div className="service-form__section">
            <div className="service-form__section-head">
              <div>
                <p className="service-form__tagline">Modalidad</p>
                <h3>Dónde y cómo trabajás</h3>
              </div>
            </div>
            <div className="service-form__grid">
              <div className="form-field">
                <label className="label">Localización</label>
                <select value={areaType} onChange={e=> resetForArea(e.target.value)}>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="REMOTO">Remoto</option>
                  <option value="PERSONALIZADO">Personalizado</option>
                </select>
              </div>
              {areaType === 'PRESENCIAL' && (
                <div className="form-field">
                  <label className="label">Radio (km) opcional</label>
                  <input type="number" min={0} value={radiusKm} onChange={e=> setRadiusKm(e.target.value===''? '': Number(e.target.value))} />
                </div>
              )}
              {areaType === 'PERSONALIZADO' && (
                <div className="form-field full-width">
                  <label className="label">Nota de ubicación</label>
                  <input value={locationNote} onChange={e=> setLocationNote(e.target.value)} placeholder="Ej: Rosario zona sur" />
                </div>
              )}
            </div>
          </div>

          {err && <div className="muted" style={{color:'#b00020'}}>{err}</div>}
          <div className="service-form__actions">
            <p className="service-form__tagline">Revisaremos que la información cumpla las normas de publicación.</p>
            <button className="btn btn--primary" disabled={saving}>{saving? 'Creando…':'Crear servicio'}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
