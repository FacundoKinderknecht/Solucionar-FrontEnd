import { loginWithPassword } from "../services/auth";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await loginWithPassword(email, password);
      location.assign("/");
    } catch (err: unknown) {
      const error = err as Error;
      setErr(error?.message ?? "Error al ingresar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="card form">
          <h2 className="h2">Ingresar</h2>
          <p className="muted">Usa tu email y contraseña</p>

          <form onSubmit={onSubmit}>
            <div className="form-row">
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="demo@example.com" required />
            </div>
            <div className="form-row">
              <label className="label">Contraseña</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>

            {err && <div className="muted" style={{color:"#b00020"}}>{err}</div>}

            <div className="actions">
              <button className="btn btn--primary" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
