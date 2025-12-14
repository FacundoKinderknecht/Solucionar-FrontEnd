import { useEffect, useMemo, useState } from "react";
import { listCategories, listServices, listServiceImages, type Category, type Service, bookService } from "../services/services";
import { Link, useLocation } from "react-router-dom";

export default function Services() {
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<Service[]>([]);
  const [covers, setCovers] = useState<Record<number, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [bookingState, setBookingState] = useState<{ [key: number]: boolean }>({});
  // new: which service booking panel is open and chosen datetime per service
  const [bookingOpen, setBookingOpen] = useState<number | null>(null);
  const [bookingDatetime, setBookingDatetime] = useState<{ [key: number]: string }>({});

  const location = useLocation();
  useEffect(() => {
    listCategories().then(setCategories).catch(()=>{});
    const params = new URLSearchParams(location.search);
    const cat = params.get('category_id');
    if (cat) setCategoryId(Number(cat));
    const query = params.get('q');
    if (query) setQ(query);
  }, [location.search]);

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
  // Trigger search whenever q or categoryId changes, including empty values
  useEffect(() => { (async ()=>{ await search(); })(); }, [categoryId, q]);

  // Load cover images for current items
  useEffect(() => {
    (async () => {
      const entries: [number, string | undefined][] = [];
      for (const svc of items) {
        try {
          const imgs = await listServiceImages(svc.id);
          const cover = imgs.find(i => i.is_cover)?.url || imgs[0]?.url;
          entries.push([svc.id, cover]);
        } catch {}
      }
      if (entries.length) setCovers(Object.fromEntries(entries));
    })();
  }, [items]);

  // Client-side filters: price range and availability
  const filteredItems = useMemo(() => {
    const min = priceMin ? Number(priceMin) : undefined;
    const max = priceMax ? Number(priceMax) : undefined;
    return items.filter(s => {
      if (onlyAvailable && !s.active) return false;
      const effectivePrice = s.price_to_agree ? 0 : s.price;
      if (typeof min === 'number' && effectivePrice < min) return false;
      if (typeof max === 'number' && effectivePrice > max) return false;
      return true;
    });
  }, [items, priceMin, priceMax, onlyAvailable]);

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
        <div className="form-row" style={{gap:8, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))'}}>
          <input placeholder="Buscar" value={q} onChange={e=>setQ(e.target.value)} style={{border:'1px solid #e7eaf0', borderRadius:10, padding:'10px 12px'}}/>
          <select value={categoryId ?? ''} onChange={e=>setCategoryId(e.target.value? Number(e.target.value): undefined)} style={{border:'1px solid #e7eaf0', borderRadius:10, padding:'10px 12px'}}>
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" placeholder="Precio mínimo" value={priceMin} onChange={e=>setPriceMin(e.target.value)} style={{border:'1px solid #e7eaf0', borderRadius:10, padding:'10px 12px'}}/>
          <input type="number" placeholder="Precio máximo" value={priceMax} onChange={e=>setPriceMax(e.target.value)} style={{border:'1px solid #e7eaf0', borderRadius:10, padding:'10px 12px'}}/>
          <label style={{display:'flex', alignItems:'center', gap:8}}>
            <input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)} />
            Solo disponibles
          </label>
          <button className="btn btn--primary" onClick={search} disabled={loading}>{loading? 'Buscando...':'Buscar'}</button>
        </div>
        {err && <div className="muted" style={{color:'#b00020'}}>{err}</div>}
        <div className="grid" style={{marginTop:16, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20, alignItems:'start'}}>
          {filteredItems.map(s => (
            <div key={s.id} className="card" style={{border:'1px solid #e7eaf0', borderRadius:16, background:'#fff', boxShadow:'0 10px 24px rgba(13,40,112,0.08)', overflow:'hidden', maxWidth:360, width:'100%', margin:'0 auto'}}>
              <div style={{position:'relative'}}>
                <div style={{aspectRatio:'4/3', background:'#f4f6f8'}}>
                  {covers[s.id] ? (
                    <img src={covers[s.id]} alt="" style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}} />
                  ) : (
                    <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#9aa3ad'}}>Sin imagen</div>
                  )}
                </div>
                {/* Category badge top-right */}
                <span style={{position:'absolute', right:10, top:10, background:'#eef2ff', color:'#0d2870', border:'1px solid #dbe1ff', borderRadius:999, padding:'6px 10px', fontSize:12, fontWeight:600}}>
                  {categories.find(c=>c.id===s.category_id)?.name ?? 'Sin categoría'}
                </span>
              </div>
              <div style={{padding:18}}>
                <h3 className="h3" style={{margin:0}}>{s.title}</h3>
                <div className="muted" style={{marginTop:6}}>{s.price_to_agree ? 'Precio a convenir' : `${s.currency} ${s.price.toLocaleString()}`} • {s.duration_min===0 ? 'duración indefinida' : `${s.duration_min} min`}</div>
                <p className="muted" style={{marginTop:10}}>{s.description.slice(0,160)}{s.description.length>160?'…':''}</p>
                <div style={{marginTop:14, display:'flex', justifyContent:'flex-end'}}>
                  <Link className="btn btn--primary" to={`/services/${s.id}`} style={{padding:'8px 14px'}}>Ver detalle</Link>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && !loading && <div className="muted">No hay resultados.</div>}
        </div>
      </div>
    </section>
  );
}
