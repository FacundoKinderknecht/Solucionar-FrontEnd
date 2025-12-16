import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile, type UserProfile, type UserProfileUpdate } from "../services/user";
import { Link } from "react-router-dom";
import { listMyServices, type Service } from "../services/services";

export default function Account() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile'|'my-services'|'orders'|'metrics'>('profile');
  const [myServices, setMyServices] = useState<Service[]>([]);

  useEffect(() => {
    setLoading(true);
    getMyProfile()
      .then(async (p) => {
        setProfile(p);
        if (p.role === 'PROVIDER') {
          try { const svcs = await listMyServices(); setMyServices(svcs); } catch {}
        }
      })
      .catch(() => setErr("No se pudo cargar tu perfil"))
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true); setErr(null);
    try {
      const payload: UserProfileUpdate = {
        full_name: profile.full_name,
        phone: profile.phone ?? null,
        province: profile.province ?? null,
        city: profile.city ?? null,
      };
      const updated = await updateMyProfile(payload);
      setProfile(updated);
    } catch (err: unknown) {
      const e = err as Error; setErr(e?.message ?? "No se pudo guardar");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="container"><p>Cargando…</p></div>;
  if (!profile) return <div className="container"><p>Sin perfil</p></div>;

  return (
    <section className="section" style={{padding:'64px 0 0'}}>
      <div className="container account-layout">
        <aside className="card account-sidebar" style={{padding:0}}>
          <div className="list">
            <button className={`btn btn--ghost ${activeTab==='profile'?'active':''}`} onClick={()=>setActiveTab('profile')}>Mi perfil</button>
            {profile.role === 'PROVIDER' && (
              <button className={`btn btn--ghost ${activeTab==='my-services'?'active':''}`} onClick={()=>setActiveTab('my-services')}>Mis servicios publicados</button>
            )}
            <button className={`btn btn--ghost ${activeTab==='orders'?'active':''}`} onClick={()=>setActiveTab('orders')}>Servicios pedidos</button>
            {profile.role === 'PROVIDER' && (
              <button className={`btn btn--ghost ${activeTab==='metrics'?'active':''}`} onClick={()=>setActiveTab('metrics')}>Métricas</button>
            )}
            <div style={{flex:1}} />
            {profile.role !== 'PROVIDER' && (
              <Link className="btn btn--primary" to="/become-provider">Quiero ser proveedor</Link>
            )}
          </div>
        </aside>
        <main style={{display:'flex', height:'100%'}}>
          {/* Uniform card sizing */}
          {/** Use consistent minHeight and maxWidth for all cards in account */}
          {/** Styles applied inline for minimal change; can be moved to CSS later */}
          {activeTab==='profile' && (
            <div className="card form account-card" style={{flex:1}}>
              <h2 className="h2">Mi perfil</h2>
              <p className="muted">Gestioná tus datos personales</p>
              <form onSubmit={onSave} className="account-card__content">
                <div className="form-row"><label className="label">Nombre</label>
                  <input value={profile.full_name} onChange={e=>setProfile({...profile, full_name: e.target.value})} /></div>
                <div className="form-row"><label className="label">Email</label>
                  <input value={profile.email} readOnly /></div>
                <div className="form-row"><label className="label">Teléfono</label>
                  <input value={profile.phone ?? ''} onChange={e=>setProfile({...profile, phone: e.target.value})} /></div>
                <div className="form-row"><label className="label">Provincia</label>
                  <input value={profile.province ?? ''} onChange={e=>setProfile({...profile, province: e.target.value})} /></div>
                <div className="form-row"><label className="label">Ciudad</label>
                  <input value={profile.city ?? ''} onChange={e=>setProfile({...profile, city: e.target.value})} /></div>
                {err && <div className="muted" style={{color:'#b00020'}}>{err}</div>}
                <div className="actions account-card__actions"><button className="btn btn--primary" disabled={saving}>{saving? 'Guardando…':'Guardar'}</button></div>
              </form>
            </div>
          )}

          {activeTab==='my-services' && profile.role==='PROVIDER' && (
            <div className="card account-card" style={{flex:1}}>
              <h2 className="h2">Mis servicios publicados</h2>
              <p className="muted">Total publicados: {myServices.length}</p>
              <div className="account-card__content">
                {myServices.length===0 ? (
                  <p className="muted">Todavía no creaste servicios.</p>
                ) : (
                  <div className="services-table-wrapper">
                    <table className="services-table">
                      <thead>
                        <tr>
                          <th>Servicio</th>
                          <th>Precio</th>
                          <th>Estado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {myServices.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <div className="service-title">{s.title}</div>
                              <div className="muted-small">ID #{s.id}</div>
                            </td>
                            <td>{s.price_to_agree? 'A convenir' : `${s.currency} ${s.price.toLocaleString()}`}</td>
                            <td>
                              <span className={`chip ${s.active ? 'chip--success' : 'chip--muted'}`}>
                                {s.active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td style={{textAlign:'right'}}>
                              <div className="services-actions">
                                <a className="btn btn--ghost" href={`/services/${s.id}`}>Ver</a>
                                <a className="btn btn--ghost" href={`/services/${s.id}/edit`}>Editar</a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="account-card__actions" style={{marginTop:12}}>
                  <Link className="btn btn--primary" to="/services/new">Crear nuevo servicio</Link>
                </div>
              </div>
            </div>
          )}

          {activeTab==='orders' && (
            <div className="card account-card" style={{flex:1}}>
              <h2 className="h2">Servicios pedidos</h2>
              <div className="account-card__content">
                <p className="muted">Proximamente: ver tus solicitudes de servicios.</p>
              </div>
            </div>
          )}

        <div className="card" style={{marginTop:16}}>
          <h3 className="h3">Mis Reservas</h3>
          <p>Ver el historial de todos los servicios que has reservado.</p>
          <Link className="btn btn--primary" to="/my-bookings">Ver mis reservas</Link>
        </div>

        <div className="card" style={{marginTop:16}}>
          <h3 className="h3">Proveedores</h3>
          {profile.role === 'PROVIDER' ? (
            <>
              <p>Accede a tu panel de proveedor para ver métricas y configurar tus servicios.</p>
              <Link className="btn btn--primary" to="/provider">Ver panel</Link>
            </>
          ) : (
            <>
              <p>¿Querés publicar servicios? Convertite en proveedor completando tu perfil fiscal.</p>
              <Link className="btn btn--primary" to="/become-provider">Quiero ser proveedor</Link>
            </>
          )}
          </div>
          {activeTab==='metrics' && profile.role==='PROVIDER' && (
            <div className="card account-card" style={{flex:1}}>
              <h2 className="h2">Métricas</h2>
              <div className="account-card__content">
                <ul>
                  <li>Servicios publicados: {myServices.length}</li>
                  <li>Visualizaciones: próximamente</li>
                  <li>Valoración media: próximamente</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
