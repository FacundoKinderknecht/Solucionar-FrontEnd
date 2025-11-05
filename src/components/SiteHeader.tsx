import { Link, useNavigate } from "react-router-dom";
import { getToken, clearToken } from "../services/api";

export default function SiteHeader() {
  const nav = useNavigate();
  const token = getToken();

  function onLogout() {
    clearToken();
    nav("/");
  }

  return (
    <header className="qf-nav">
      <div className="container qf-nav__inner">
        <div className="qf-nav__brand" onClick={()=>nav("/")} style={{cursor:"pointer"}}>
          <div className="logo-dot">SA</div>
          <span>Solucion.ar</span>
        </div>
        <nav className="qf-nav__links">
          <Link to="/">Inicio</Link>
          <Link to="/services">Servicios</Link>
          {!token && <Link to="/login">Ingresar</Link>}
        </nav>
        <div className="qf-nav__cta">
          {!token ? (
            <>
              <Link className="btn btn--ghost" to="/register">Crear cuenta</Link>
              <Link className="btn btn--primary" to="/become-provider">Quiero ser proveedor</Link>
            </>
          ) : (
            <>
              <Link className="btn btn--ghost" to="/account">Mi cuenta</Link>
              <button className="btn btn--primary" onClick={onLogout}>Salir</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
