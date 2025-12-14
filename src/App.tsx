import { Outlet } from "react-router-dom";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { useNavigate } from "react-router-dom";

export default function App() {
  const nav = useNavigate();
  return (
    <div id="app-root">
      <SiteHeader />
      <div className="backbar">
        <div className="container">
          <a className="back-link" onClick={()=>nav(-1)}>Volver</a>
        </div>
      </div>
      <main>
        <Outlet />
      </main>
      {/* Crisp floating button removed; Crisp's own bubble will handle launch */}
      <SiteFooter />
    </div>
  );
}
