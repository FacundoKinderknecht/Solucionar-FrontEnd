import { useEffect, useState } from "react";
import { BASE_URL, getToken } from "../services/api";
import { listMyServices, type Service } from "../services/services";

type ProviderDashboardData = {
  provider_id: number;
  totals: { services_published: number; reservations_total: number; reservations_completed: number; favorites_count: number; };
  ratings: { average: number; count: number };
  revenue: { total: number; currency: string };
};

export default function ProviderDashboard() {
  const [data, setData] = useState<ProviderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [myServices, setMyServices] = useState<Service[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) { setErr("No token"); setLoading(false); return; }
    fetch(`${BASE_URL}/providers/me/dashboard`, { headers: { Authorization: `Bearer ${token}` }})
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
    listMyServices().then(setMyServices).catch(()=>{});
  }, []);

  return (
    <section className="section">
      <div className="container">
        <h2 className="h2">Panel de proveedor</h2>
        {loading ? <p>Cargando…</p> : err ? <p style={{color:'#b00020'}}>{err}</p> : (
          <>
            <div className="card">
              <h3 className="h3">Métricas</h3>
              <ul>
                <li>Servicios publicados: {myServices.length}</li>
                <li>Reservas totales: {data?.totals?.reservations_total ?? 0}</li>
                <li>Reservas completadas: {data?.totals?.reservations_completed ?? 0}</li>
                <li>Favoritos: {data?.totals?.favorites_count ?? 0}</li>
              </ul>
              <div style={{marginTop:12}}>
                <a className="btn btn--primary" href="/services/new">Crear nuevo servicio</a>
              </div>
            </div>
            <div className="card" style={{marginTop:16}}>
              <h3 className="h3">Mis servicios</h3>
              {myServices.length===0 && <p className="muted">Todavía no creaste servicios.</p>}
              <ul>
                {myServices.map(s => (
                  <li key={s.id} style={{display:'flex', justifyContent:'space-between', gap:8}}>
                    <span>{s.title}</span>
                    <a className="btn btn--ghost" href={`/services/${s.id}`}>Ver</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card" style={{marginTop:16}}>
              <h3 className="h3">Reputación</h3>
              <p>Rating promedio: {data?.ratings?.average ?? 0} ({data?.ratings?.count ?? 0} reseñas)</p>
            </div>
            <div className="card" style={{marginTop:16}}>
              <h3 className="h3">Ingresos</h3>
              <p>Total: {data?.revenue?.total ?? 0} {data?.revenue?.currency ?? 'ARS'}</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
