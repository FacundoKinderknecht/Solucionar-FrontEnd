import { useNavigate } from "react-router-dom";

export default function BecomeProviderPromo() {
  const nav = useNavigate();
  const handleClick = () => {
    nav("/register?next=provider");
  };
  return (
    <section className="provider-promo" style={{
      background: "linear-gradient(135deg,#eef4ff 0%, #e6edff 50%, #eef4ff 100%)",
      padding: "3.5rem 1rem",
      borderTop: "1px solid #e7eaf0"
    }}>
      <div className="container" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          alignItems: "center"
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.2, color: "#0f172a" }}>
              Únete como Proveedor
            </h2>
            <p style={{ marginTop: 10, fontSize: 16, color: "#334155" }}>
              Empieza a ofrecer tus servicios hoy. Llega a más clientes,
              gestiona tus solicitudes y construye tu reputación con reseñas verificadas.
            </p>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn--primary" style={{ padding: "12px 18px" }} onClick={handleClick}>
                Crear cuenta y ser proveedor
              </button>
            </div>
          </div>
          <div style={{
            width: "100%",
            height: 220,
            borderRadius: 18,
            border: "1px solid #e7eaf0",
            overflow: 'hidden',
            background: "#ffffff",
            boxShadow: "0 18px 40px rgba(13,40,112,0.12)"
          }}>
            <img
              src="https://www.shutterstock.com/image-vector/home-repair-logo-modern-design-260nw-2492332483.jpg"
              alt="Promoción proveedores de servicios del hogar"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display:'block' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
