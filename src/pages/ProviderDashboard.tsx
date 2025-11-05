import { useEffect, useState } from "react";
import { BASE_URL, getToken } from "../services/api";

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
                <li>Servicios publicados: {data?.totals?.services_published ?? 0}</li>
                <li>Reservas totales: {data?.totals?.reservations_total ?? 0}</li>
                <li>Reservas completadas: {data?.totals?.reservations_completed ?? 0}</li>
                <li>Favoritos: {data?.totals?.favorites_count ?? 0}</li>
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
