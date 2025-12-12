export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <div className="logo-dot">SA</div>
          <div className="muted">Tu aliado para soluciones en el hogar.</div>
        </div>
        <div>
          <div className="label">Compañía</div>
          <ul className="link-list">
            <li><a href="/#como-funciona">Cómo funciona</a></li>
            <li><a href="/login">Conviértete en proveedor</a></li>
            <li><a href="/terms">Términos y privacidad</a></li>
          </ul>
        </div>
        <div>
          <div className="label">Contacto</div>
          <ul className="link-list">
            <li>support@solucion.ar</li>
            <li>Argentina</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
