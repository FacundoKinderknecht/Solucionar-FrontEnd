
import { useEffect, useState } from "react";
import { getMyProvider, upsertMyProvider } from "../services/auth";

type TaxStatus = "MONOTRIBUTO" | "RESPONSABLE_INSCRIPTO" | "EXENTO";

const CATEGORY_CHOICES = [
  "Electricidad",
  "Plomería",
  "Pintura",
  "Carpintería",
  "Albañilería",
  "Jardinería",
  "Limpieza",
  "Gasista",
  "Herrería",
  "Mudanzas",
] as const;

const SERVICE_AREA_CHOICES = [
  "CABA",
  "GBA Norte",
  "GBA Sur",
  "GBA Oeste",
  "La Plata",
  "Rosario",
  "Córdoba Capital",
] as const;

type Form = {
  legalName: string;
  cuitOrCuil: string;
  taxStatus: TaxStatus;
  fiscalAddress?: string;
  serviceAreas?: typeof SERVICE_AREA_CHOICES[number];
  category?: typeof CATEGORY_CHOICES[number];
  hasInvoice: boolean;
  bankAlias?: string;
  bankCbu?: string;
};

type ProviderMe = {
  legal_name?: string;
  cuit_or_cuil?: string;
  tax_status?: TaxStatus;
  category?: typeof CATEGORY_CHOICES[number];
  service_areas?: typeof SERVICE_AREA_CHOICES[number];
};

export default function BecomeProvider() {
  const [form, setForm] = useState<Form>({
    legalName: "",
    cuitOrCuil: "",
    taxStatus: "MONOTRIBUTO",
    fiscalAddress: "",
    serviceAreas: SERVICE_AREA_CHOICES[0],
    category: CATEGORY_CHOICES[0],
    hasInvoice: true,
    bankAlias: "",
    bankCbu: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getMyProvider()
      .then((data: ProviderMe) => {
        if (data) {
          setForm((prev) => ({
            ...prev,
            legalName: data.legal_name ?? prev.legalName,
            cuitOrCuil: data.cuit_or_cuil ?? prev.cuitOrCuil,
            taxStatus: data.tax_status ?? prev.taxStatus,
            category: (data.category && CATEGORY_CHOICES.includes(data.category) ? data.category : prev.category),
            serviceAreas: (data.service_areas && SERVICE_AREA_CHOICES.includes(data.service_areas) ? data.service_areas : prev.serviceAreas),
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm(prev => ({ ...prev, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      if (!/^\d{11}$/.test(form.cuitOrCuil)) throw new Error("CUIT/CUIL inválido (11 dígitos)");
      if (form.hasInvoice) {
        if (!form.bankAlias && !form.bankCbu) throw new Error("Informá un alias o CBU para pagos");
      }

      const payload = {
        legal_name: form.legalName,
        cuit_or_cuil: form.cuitOrCuil,
        tax_status: form.taxStatus,
        fiscal_address: form.fiscalAddress,
        service_areas: form.serviceAreas,
        category: form.category,
        has_invoice: form.hasInvoice,
        bank_alias: form.bankAlias,
        bank_cbu: form.bankCbu,
      };

  await upsertMyProvider(payload);
  location.assign('/account');
    } catch (err: unknown) {
      const e = err as Error;
      setErr(e?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
        <div className="container">
          <div className="card form">
            <h2 className="h2">Convertirte en proveedor</h2>
            <p className="muted">Completa tus datos fiscales y profesionales para operar como proveedor.</p>

            <form onSubmit={onSubmit}>
              <div className="form-row"><label className="label">Nombre legal / Razón social</label>
                <input value={form.legalName} onChange={e=>set('legalName', e.target.value)} required /></div>

              <div className="form-row"><label className="label">CUIT/CUIL (11 dígitos)</label>
                <input value={form.cuitOrCuil} onChange={e=>set('cuitOrCuil', e.target.value)} required /></div>

              <div className="form-row"><label className="label">Condición impositiva</label>
                <select value={form.taxStatus} onChange={e=>set('taxStatus', e.target.value as TaxStatus)}>
                  <option value="MONOTRIBUTO">Monotributista</option>
                  <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                  <option value="EXENTO">Exento</option>
                </select>
              </div>

              <div className="form-row"><label className="label">Domicilio fiscal</label>
                <input value={form.fiscalAddress} onChange={e=>set('fiscalAddress', e.target.value)} /></div>

              <div className="form-row"><label className="label">Categoría</label>
                <select value={form.category}
                        onChange={e=>set('category', e.target.value as typeof CATEGORY_CHOICES[number])}>
                  {CATEGORY_CHOICES.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="form-row"><label className="label">Zona donde trabajás</label>
                <select value={form.serviceAreas}
                        onChange={e=>set('serviceAreas', e.target.value as typeof SERVICE_AREA_CHOICES[number])}>
                  {SERVICE_AREA_CHOICES.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="form-row"><label className="label">¿Emites factura electrónica?</label>
                <select value={form.hasInvoice ? 'yes':'no'} onChange={e=>set('hasInvoice', e.target.value==='yes')}>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
                <span className="muted">Requerido para activar la cuenta como proveedor.</span>
              </div>

              <div className="form-row"><label className="label">Alias/CBU</label>
                <input placeholder="Alias" value={form.bankAlias} onChange={e=>set('bankAlias', e.target.value)} />
                <input placeholder="CBU" value={form.bankCbu} onChange={e=>set('bankCbu', e.target.value)} /></div>

              {/* Campos retirados: IIBB, punto de venta, tipo de comprobante, constancia AFIP, seguro RC, acerca de, licencia/matrícula y redes */}

              {err && <div className="muted" style={{color:'#b00020'}}>{err}</div>}

              <div className="actions"><button className="btn btn--primary" disabled={loading}>{loading? 'Guardando...':'Guardar y activar'}</button></div>
            </form>
          </div>
        </div>
      </section>
  );
}
