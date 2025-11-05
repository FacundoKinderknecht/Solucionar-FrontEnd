import { useEffect, useState } from "react";
import { fetchMe, logout } from "../services/auth";
import { useNavigate } from "react-router-dom";

type Me = {
  id: number;
  full_name: string;
  email: string;
  role: string;
};

export default function Home() {
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch(() => setError("Sesión expirada o inválida"))
      .finally(() => setLoading(false));
  }, [nav]);

  const onLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <div style={{ maxWidth: 360, margin: "0 auto", textAlign: "left" }}>
      <p>
      </p>
      <h1>Home</h1>
      {error && <p style={{ color: "tomato" }}>{error}</p>}
      {loading ? (
        <p>Cargando…</p>
      ) : !me ? (
        <>
          <p>Bienvenido a Solucion.ar — inicia sesión para administrar tu cuenta o registrarte como proveedor.</p>
          <p><a href="/login" className="btn">Iniciar sesión</a> <a href="/register" className="btn">Crear cuenta</a></p>
        </>
      ) : (
        <>
          <p><b>Nombre:</b> {me.full_name}</p>
          <p><b>Email:</b> {me.email}</p>
          <p><b>Rol:</b> {me.role}</p>
          <button onClick={onLogout}>Cerrar sesión</button>
        </>
      )}
    </div>
  );
}
