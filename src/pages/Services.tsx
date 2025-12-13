import { useEffect, useState } from "react";
import { listCategories, listServices, type Category, type Service, bookService } from "../services/services";
import { Link } from "react-router-dom";

export default function Services() {
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<{ [key: number]: boolean }>({});
  // new: which service booking panel is open and chosen datetime per service
  const [bookingOpen, setBookingOpen] = useState<number | null>(null);
  const [bookingDatetime, setBookingDatetime] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    listCategories().then(setCategories).catch(()=>{});
  }, []);

  async function search() {
    setLoading(true); setErr(null);
    try {
      const data = await listServices(q || undefined, categoryId);
      setItems(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { (async ()=>{ await listServices().then(setItems).catch(()=>{}); })(); }, []);

  // new: validate against service availability dates (if present)
  function validateDatetimeForService(svc: Service, iso: string) {
    if (!iso) return "Elegí fecha y hora";
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "Fecha inválida";
    if ((svc as any).availability_start_date) {
      const start = new Date((svc as any).availability_start_date);
      if (dt < start) return `Fecha anterior a disponibilidad (${start.toLocaleDateString()})`;
    }
    if ((svc as any).availability_end_date) {
      const end = new Date((svc as any).availability_end_date);
      if (dt > end) return `Fecha posterior a disponibilidad (${end.toLocaleDateString()})`;
    }
    return null;
  }

  async function handleOpenBooking(svcId: number) {
    setErr(null);
    setBookingOpen(svcId);
    // preset to next hour
    const now = new Date();
    now.setMinutes(0,0,0);
    now.setHours(now.getHours()+1);
    const isoLocal = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
    setBookingDatetime(prev => ({ ...prev, [svcId]: isoLocal }));
  }

  async function handleCancelBooking(svcId:number) {
    setBookingOpen(prev => prev === svcId ? null : prev);
  }

  async function handleConfirmBooking(svc: Service) {
    const svcId = svc.id;
    const chosen = bookingDatetime[svcId];
    const validationError = validateDatetimeForService(svc, chosen);
    if (validationError) { setErr(validationError); return; }

    if (!window.confirm("¿Confirmas la reserva en la fecha y hora seleccionada?")) return;

    setBookingState(prev => ({ ...prev, [svcId]: true }));
    setErr(null);
    try {
      // call bookService with datetime (backend expects reservation_datetime in payload)
      // assume bookService(serviceId, isoDatetime) is implemented in services client
      await bookService(svcId, new Date(chosen).toISOString());
      alert("¡Servicio reservado con éxito!");
      setBookingOpen(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBookingState(prev => ({ ...prev, [svcId]: false }));
    }
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="h2">Servicios</h1>
        <div className="form-row" style={{gap:8, display:'flex'}}>
          <input placeholder="Buscar" value={q} onChange={e=>setQ(e.target.value)} />
          <select value={categoryId ?? ''} onChange={e=>setCategoryId(e.target.value? Number(e.target.value): undefined)}>
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn--primary" onClick={search} disabled={loading}>{loading? 'Buscando...':'Buscar'}</button>
        </div>
        {err && <div className="muted" style={{color:'#b00020'}}>{err}</div>}
        <div className="grid" style={{marginTop:16}}>
          {items.map(s => (
            <div key={s.id} className="card">
              <div className="card__body">
                <h3 className="h3">{s.title}</h3>
                <div className="muted">{s.currency} {s.price.toFixed(2)} • {s.duration_min} min</div>
                <p className="muted" style={{marginTop:8}}>{s.description.slice(0,140)}{s.description.length>140?'…':''}</p>
                <div style={{marginTop:8, display: 'flex', gap: '8px', flexDirection:'column'}}>
                  <div style={{display:'flex', gap:8}}>
                    <Link className="btn btn--ghost" to={`/services/${s.id}`}>Ver detalle</Link>
                    <button
                      className="btn btn--primary"
                      onClick={() => handleOpenBooking(s.id)}
                      disabled={loading || bookingState[s.id]}>
                      Reservar
                    </button>
                  </div>

                  {/* booking panel */}
                  {bookingOpen === s.id && (
                    <div style={{marginTop:8, border:'1px solid #eee', padding:8, borderRadius:6, background:'#fafafa'}}>
                      <label className="label" style={{marginBottom:6}}>Elegí fecha y hora</label>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <input
                          type="datetime-local"
                          value={bookingDatetime[s.id] ?? ''}
                          onChange={e=> setBookingDatetime(prev => ({ ...prev, [s.id]: e.target.value }))}
                        />
                        <button className="btn btn--primary" onClick={()=>handleConfirmBooking(s)} disabled={bookingState[s.id]}>
                          {bookingState[s.id] ? 'Reservando...' : 'Confirmar'}
                        </button>
                        <button className="btn btn--ghost" onClick={()=>handleCancelBooking(s.id)}>Cancelar</button>
                      </div>
                      <div style={{marginTop:8}} className="muted">
                        { (s as any).availability_start_date || (s as any).availability_end_date ? (
                          <>
                            Disponibilidad:
                            { (s as any).availability_start_date ? ` desde ${new Date((s as any).availability_start_date).toLocaleDateString()}` : '' }
                            { (s as any).availability_end_date ? ` hasta ${new Date((s as any).availability_end_date).toLocaleDateString()}` : '' }
                          </>
                        ) : 'Seleccioná fecha y hora.' }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading && <div className="muted">No hay resultados.</div>}
        </div>
      </div>
    </section>
  );
}
