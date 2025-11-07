import { useEffect, useState } from "react";
import { listCategories, listServices, type Category, type Service } from "../services/services";
import { Link } from "react-router-dom";

export default function Services() {
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
                <div style={{marginTop:8}}>
                  <Link className="btn btn--ghost" to={`/services/${s.id}`}>Ver detalle</Link>
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
