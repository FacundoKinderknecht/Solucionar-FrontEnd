import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile, type UserProfile, type UserProfileUpdate } from "../services/user";
import { Link } from "react-router-dom";

export default function Account() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getMyProfile()
      .then(setProfile)
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
    <section className="section">
      <div className="container">
        <div className="card form">
          <h2 className="h2">Mi cuenta</h2>
          <p className="muted">Gestiona tus datos personales</p>
          <form onSubmit={onSave}>
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
            <div className="actions"><button className="btn btn--primary" disabled={saving}>{saving? 'Guardando…':'Guardar'}</button></div>
          </form>
        </div>

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
      </div>
    </section>
  );
}
