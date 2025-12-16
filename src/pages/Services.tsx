import { useEffect, useMemo, useState } from "react";
import {
  listCategories,
  listServices,
  listServiceImages,
  getReviewSummaries,
  type Category,
  type Service,
  type ReviewSummary,
} from "../services/services";
import { Link, useLocation } from "react-router-dom";
import { AvailabilityFilterStrategy, CompositeFilterStrategy, PriceRangeFilterStrategy } from "../utils/serviceFilters";

export default function Services() {
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<Service[]>([]);
  const [covers, setCovers] = useState<Record<number, string | undefined>>({});
  const [ratings, setRatings] = useState<Record<number, ReviewSummary>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);

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

  useEffect(() => {
    const ids = items.map((svc) => svc.id);
    if (!ids.length) {
      setRatings({});
      return;
    }
    getReviewSummaries(ids)
      .then((summaryList) => setRatings(Object.fromEntries(summaryList.map((summary) => [summary.service_id, summary]))))
      .catch(() => setRatings({}));
  }, [items]);

  // Client-side filters: price range and availability
  const filteredItems = useMemo(() => {
    const min = priceMin ? Number(priceMin) : undefined;
    const max = priceMax ? Number(priceMax) : undefined;
    const strategy = new CompositeFilterStrategy([
      new AvailabilityFilterStrategy(onlyAvailable),
      new PriceRangeFilterStrategy(min, max),
    ]);
    return strategy.apply(items);
  }, [items, priceMin, priceMax, onlyAvailable]);

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
                <div style={{marginTop:6, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                  <div className="muted">{s.price_to_agree ? 'Precio a convenir' : `${s.currency} ${s.price.toLocaleString()}`} • {s.duration_min===0 ? 'duración indefinida' : `${s.duration_min} min`}</div>
                  <span
                    style={{fontSize:12, background:'#eef2ff', color:'#0d2870', borderRadius:999, padding:'4px 10px', display:'inline-flex', alignItems:'center', gap:4}}
                    title={ratings[s.id]?.count ? `${ratings[s.id].count} reseñas` : "Sin reseñas"}
                  >
                    <span style={{color:'#f59e0b'}}>★</span>
                    {ratings[s.id]?.count ? ratings[s.id].average.toFixed(1) : "Nuevo"}
                  </span>
                </div>
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
