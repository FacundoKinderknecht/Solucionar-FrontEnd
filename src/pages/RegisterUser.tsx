import { useState } from "react";
import { postJSON } from "../services/api";

type RegisterUserPayload = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  province?: string;
  city?: string;
  role: "USER";
  consent: boolean;
  acceptTerms: boolean;
};

export default function RegisterUser() {
  const [form, setForm] = useState<RegisterUserPayload>({
    fullName: "", email: "", password: "", phone: "", province: "", city: "",
    role: "USER", consent: false, acceptTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof RegisterUserPayload>(k: K, v: RegisterUserPayload[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      if (!form.consent || !form.acceptTerms) throw new Error("Debes aceptar términos y consentimiento.");
      const payload = {
        full_name: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone ?? null,
        province: form.province ?? null,
        city: form.city ?? null,
      };
      await postJSON("/auth/register", payload);
      location.assign("/login");
    } catch (err: unknown) {
      const error = err as Error;
      setErr(error?.message ?? "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="card form">
          <h2 className="h2">Crear cuenta</h2>
          <p className="muted">Para solicitar servicios</p>
          <form onSubmit={onSubmit}>
            <div className="form-row"><label className="label">Nombre y apellido</label>
              <input value={form.fullName} onChange={e=>set("fullName", e.target.value)} required /></div>
            <div className="form-row"><label className="label">Email</label>
              <input type="email" value={form.email} onChange={e=>set("email", e.target.value)} required /></div>
            <div className="form-row"><label className="label">Contraseña</label>
              <input type="password" value={form.password} onChange={e=>set("password", e.target.value)} required /></div>
            <div className="form-row"><label className="label">Teléfono (opcional)</label>
              <input value={form.phone} onChange={e=>set("phone", e.target.value)} /></div>
            <div className="form-row"><label className="label">Provincia</label>
              <input value={form.province} onChange={e=>set("province", e.target.value)} /></div>
            <div className="form-row"><label className="label">Ciudad</label>
              <input value={form.city} onChange={e=>set("city", e.target.value)} /></div>

            <div className="form-row">
              <label><input type="checkbox" checked={form.consent} onChange={e=>set("consent", e.target.checked)} />
                {" "}Autorizo el tratamiento de mis datos conforme a la Ley 25.326.</label>
            </div>
            <div className="form-row">
              <label><input type="checkbox" checked={form.acceptTerms} onChange={e=>set("acceptTerms", e.target.checked)} />
                {" "}Acepto Términos y Política de Privacidad.</label>
            </div>

            {err && <div className="muted" style={{color:"#b00020"}}>{err}</div>}
            <div className="actions"><button className="btn btn--primary" disabled={loading}>
              {loading ? "Creando..." : "Crear cuenta"}
            </button></div>
          </form>
        </div>
      </div>
    </section>
  );
}
