import { useState } from "react";
import { postJSON } from "../services/api";
import { loginWithPassword, upsertMyProvider } from "../services/auth";

type TaxStatus = "MONOTRIBUTO" | "RESPONSABLE_INSCRIPTO" | "EXENTO";
type RegisterProviderPayload = {
  legalName: string;
  email: string;
  password: string;
  phone?: string;
  cuitOrCuil: string;
  taxStatus: TaxStatus;
  fiscalAddress?: string;
  serviceAreas?: string;
  category?: string;
  hasInvoice: boolean;
  bankAlias?: string;
  licenseType?: string;
  licenseNumber?: string;
  role: "PROVIDER";
  consent: boolean;
  acceptTerms: boolean;
};

export default function RegisterProvider() {
  const [form, setForm] = useState<RegisterProviderPayload>({
    legalName: "", email: "", password: "", phone: "",
    cuitOrCuil: "", taxStatus: "MONOTRIBUTO", fiscalAddress: "",
    serviceAreas: "", category: "", hasInvoice: true, bankAlias: "",
    licenseType: "", licenseNumber: "",
    role: "PROVIDER", consent: false, acceptTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof RegisterProviderPayload>(k: K, v: RegisterProviderPayload[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      if (!form.consent || !form.acceptTerms) throw new Error("Debes aceptar términos y consentimiento.");
      if (!/^\d{11}$/.test(form.cuitOrCuil)) throw new Error("CUIT/CUIL debe tener 11 dígitos.");
      // 1) Crear usuario mínimo
      const userPayload = {
        full_name: form.legalName,
        email: form.email,
        password: form.password,
        phone: form.phone ?? null,
        province: null as string | null,
        city: null as string | null,
      };
      await postJSON("/auth/register", userPayload);
      // 2) Ingresar
      await loginWithPassword(form.email, form.password);
      // 3) Cargar perfil de proveedor
      const providerPayload = {
        legal_name: form.legalName,
        cuit_or_cuil: form.cuitOrCuil,
        tax_status: form.taxStatus,
        fiscal_address: form.fiscalAddress || null,
        service_areas: form.serviceAreas || null,
        category: form.category || null,
        has_invoice: form.hasInvoice,
        bank_alias: form.bankAlias || null,
        license_type: form.licenseType || null,
        license_number: form.licenseNumber || null,
      };
      await upsertMyProvider(providerPayload);
      location.assign("/");
    } catch (err: unknown) {
      const error = err as Error;
      setErr(error?.message ?? "No se pudo registrar el proveedor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="card form">
          <h2 className="h2">Registro de proveedor</h2>
          <p className="muted">Publica tus servicios en Solucion.ar</p>

          <form onSubmit={onSubmit}>
            <div className="form-row"><label className="label">Nombre legal / Razón social</label>
              <input value={form.legalName} onChange={e=>set("legalName", e.target.value)} required /></div>

            <div className="form-row"><label className="label">Email</label>
              <input type="email" value={form.email} onChange={e=>set("email", e.target.value)} required /></div>

            <div className="form-row"><label className="label">Contraseña</label>
              <input type="password" value={form.password} onChange={e=>set("password", e.target.value)} required /></div>

            <div className="form-row"><label className="label">Teléfono</label>
              <input value={form.phone} onChange={e=>set("phone", e.target.value)} /></div>

            <div className="form-row"><label className="label">CUIT/CUIL (11 dígitos)</label>
              <input value={form.cuitOrCuil} onChange={e=>set("cuitOrCuil", e.target.value)} required /></div>

            <div className="form-row"><label className="label">Condición impositiva</label>
              <select value={form.taxStatus} onChange={e=>set("taxStatus", e.target.value as TaxStatus)}>
                <option value="MONOTRIBUTO">Monotributista</option>
                <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                <option value="EXENTO">Exento</option>
              </select>
            </div>

            <div className="form-row"><label className="label">Domicilio fiscal</label>
              <input value={form.fiscalAddress} onChange={e=>set("fiscalAddress", e.target.value)} /></div>

            <div className="form-row"><label className="label">Categoría de servicio</label>
              <input placeholder="Electricidad, Plomería, Mudanzas..." value={form.category} onChange={e=>set("category", e.target.value)} /></div>

            <div className="form-row"><label className="label">Zonas donde trabajas</label>
              <input placeholder="CABA, GBA Norte, Rosario..." value={form.serviceAreas} onChange={e=>set("serviceAreas", e.target.value)} /></div>

            <div className="form-row">
              <label className="label">¿Emites factura electrónica?</label>
              <select value={form.hasInvoice ? "yes":"no"} onChange={e=>set("hasInvoice", e.target.value==="yes")}>
                <option value="yes">Sí (requerido)</option>
                <option value="no">No</option>
              </select>
              <span className="muted">Requerido para operar (AFIP factura electrónica).</span>
            </div>

            <div className="form-row"><label className="label">Alias/CBU (pagos)</label>
              <input value={form.bankAlias} onChange={e=>set("bankAlias", e.target.value)} /></div>

            <div className="form-row"><label className="label">Licencia/Matrícula (si corresponde)</label>
              <input placeholder="Ej. Gasista matriculado ENARGAS" value={form.licenseType} onChange={e=>set("licenseType", e.target.value)} /></div>

            <div className="form-row"><label className="label">N° de matrícula</label>
              <input value={form.licenseNumber} onChange={e=>set("licenseNumber", e.target.value)} /></div>

            <div className="form-row">
              <label><input type="checkbox" checked={form.consent} onChange={e=>set("consent", e.target.checked)} />
                {" "}Autorizo el tratamiento de mis datos conforme a la Ley 25.326.</label>
            </div>
            <div className="form-row">
              <label><input type="checkbox" checked={form.acceptTerms} onChange={e=>set("acceptTerms", e.target.checked)} />
                {" "}Acepto Términos y Política de Privacidad y me comprometo a emitir comprobantes fiscales.</label>
            </div>

            {err && <div className="muted" style={{color:"#b00020"}}>{err}</div>}
            <div className="actions"><button className="btn btn--primary" disabled={loading}>
              {loading ? "Registrando..." : "Crear cuenta de proveedor"}
            </button></div>
          </form>
        </div>
      </div>
    </section>
  );
}
