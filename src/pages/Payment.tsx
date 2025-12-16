import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getPayment,
  initiatePayment,
  completePayment,
  createPayment,
  type Payment as PaymentRecord,
  type CreatePaymentPayload,
  type PaymentGateway,
} from "../services/payments";
import { clearToken } from "../services/api";

export default function Payment() {
  const { id } = useParams();
  const pid = Number(id);
  const loc = useLocation();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();
  const [gateway, setGateway] = useState<PaymentGateway>("MERCADOPAGO");
  const [creating, setCreating] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!pid) return;
    (async () => {
      try {
        const p = await getPayment(pid);
        setPayment(p);
      } catch (e) { setErr((e as Error).message); }
    })();
  }, [pid]);

  // support flow: /payments/new?service_id=..&reservation_datetime=..&monto=..
  const qs = new URLSearchParams(loc.search);
  const qServiceId = qs.get("service_id");
  const qReservationDatetime = qs.get("reservation_datetime");
  const qMonto = qs.get("monto");
  const qMoneda = qs.get("moneda") || "ARS";
  const qNotes = qs.get("notes") ?? "";

  const reservationDate = useMemo(() => {
    if (!qReservationDatetime) return null;
    const parsed = new Date(qReservationDatetime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [qReservationDatetime]);

  const qMontoNumber = useMemo(() => {
    if (!qMonto) return undefined;
    const parsed = Number(qMonto);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [qMonto]);

  const formattedReservation = reservationDate
    ? reservationDate.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" })
    : qReservationDatetime ?? "—";

  const reservationDatetimePayload = reservationDate ? reservationDate.toISOString() : null;

  const formattedAmount = useMemo(() => {
    if (qMontoNumber === undefined) return "A convenir";
    return `${qMontoNumber.toLocaleString("es-AR", { minimumFractionDigits: 0 })} ${qMoneda}`;
  }, [qMoneda, qMontoNumber]);

  const gatewayOptions: Array<{
    value: PaymentGateway;
    label: string;
    description: string;
  }> = [
    {
      value: "MERCADOPAGO",
      label: "Mercado Pago",
      description: "Pagá con tarjeta, débito o dinero en cuenta desde una única pasarela local.",
    },
    {
      value: "CREDIT_CARD",
      label: "Tarjeta de crédito",
      description: "Redireccionamos al procesador para pagar en cuotas.",
    },
    {
      value: "DEBIT_CARD",
      label: "Tarjeta de débito",
      description: "Confirmación inmediata con débito directo.",
    },
    {
      value: "TRANSFER",
      label: "Transferencia",
      description: "Mostramos los datos bancarios para transferir desde tu banco.",
    },
  ];

  const selectedGateway = gatewayOptions.find((option) => option.value === gateway) ?? gatewayOptions[0];

  const onCreateAndInitiate = async () => {
    if (!qServiceId || !qReservationDatetime) return setErr("Faltan datos de reserva");
    if (!reservationDatetimePayload) return setErr("La fecha de la reserva no es válida. Volvé a elegir el horario.");
    try {
      setCreating(true);
      const payload: CreatePaymentPayload = {
        service_id: Number(qServiceId),
        reservation_datetime: reservationDatetimePayload,
        gateway,
      };
      if (qMontoNumber !== undefined) {
        payload.monto = qMontoNumber;
        payload.moneda = qMoneda;
      }
      if (qNotes.trim()) {
        payload.notes = qNotes.trim();
      }
      const created = await createPayment(payload);
      // initiate
      const init = await initiatePayment(created.id);
      window.open(init.payment_url, "_blank");
      // navigate to the payment page for monitoring
      window.location.href = `/payments/${created.id}`;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.startsWith("HTTP 401")) {
        clearToken();
        nav("/login");
        return;
      }
      setErr(msg);
    } finally {
      setCreating(false);
    }
  };

  if (!pid && !qServiceId) return <div className="container"><div className="muted">Pago inválido</div></div>;
  if (err) return <div className="container"><div className="muted" style={{color:"#b00020"}}>{err}</div></div>;

  if (!pid) {
    // creation page
    return (
      <section className="section payment-page">
        <div className="container payment-shell">
          <div className="payment-card card">
            <div className="payment-card__header">
              <p className="chip chip--muted">Paso 2 de 2 · Confirmar pago</p>
              <h1 className="payment-title">Elegí cómo querés pagar</h1>
              <p className="muted">
                Revisá el resumen de la reserva y seleccioná tu medio de pago preferido. No
                haremos cargos hasta que confirmes en la pasarela.
              </p>
            </div>
            <div className="payment-summary">
              <div>
                <span className="payment-summary__label">Servicio</span>
                <strong className="payment-summary__value">#{qServiceId}</strong>
              </div>
              <div>
                <span className="payment-summary__label">Fecha y hora</span>
                <strong className="payment-summary__value">{formattedReservation}</strong>
              </div>
              <div>
                <span className="payment-summary__label">Monto estimado</span>
                <strong className="payment-summary__value">{formattedAmount}</strong>
              </div>
              {qNotes && (
                <div>
                  <span className="payment-summary__label">Notas</span>
                  <strong className="payment-summary__value">{qNotes}</strong>
                </div>
              )}
            </div>

            <div className="payment-gateways">
              {gatewayOptions.map((option) => (
                <label key={option.value} className={`gateway-card ${gateway === option.value ? "gateway-card--active" : ""}`}>
                  <input
                    type="radio"
                    name="gateway"
                    value={option.value}
                    checked={gateway === option.value}
                    onChange={(e) => setGateway(e.target.value as PaymentGateway)}
                  />
                  <div>
                    <strong>{option.label}</strong>
                    <p className="muted-small">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="payment-actions">
              <button
                className="btn btn--primary"
                onClick={onCreateAndInitiate}
                disabled={creating}
              >
                {creating ? "Generando enlace…" : "Crear pago e ir a pasarela"}
              </button>
              <button className="btn btn--ghost" onClick={() => nav(-1)}>
                Volver
              </button>
            </div>
            <p className="muted-small payment-footnote">
              Seleccionaste: <strong>{selectedGateway.label}</strong>. Podés cambiarlo antes de
              generar el pago.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!payment) return <div className="container"><div className="muted">Cargando pago…</div></div>;

  const onInitiate = async () => {
    try {
      setInitiating(true);
      const res = await initiatePayment(pid);
      // open mock gateway url
      window.open(res.payment_url, "_blank");
      // refresh payment
      const p = await getPayment(pid);
      setPayment(p);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setInitiating(false);
    }
  };

  const onSimulateComplete = async () => {
    try {
      setCompleting(true);
      const p = await completePayment(pid);
      setPayment(p);
      // if reservation created, navigate to my bookings
      if (p && p.reservation_id) nav("/my-bookings");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCompleting(false);
    }
  };

  const statusBadgeClass = `status-badge status-badge--${payment.estado ?? "default"}`;

  return (
    <section className="section payment-page">
      <div className="container payment-shell">
        <div className="payment-card card">
          <div className="payment-card__header">
            <p className="chip chip--muted">Estado del pago</p>
            <h1 className="payment-title">Seguimiento del pago #{payment.id}</h1>
            <div className="status-row">
              <span className={statusBadgeClass}>{payment.estado}</span>
              {payment.reservation_id && (
                <span className="muted-small">Reserva #{payment.reservation_id} creada</span>
              )}
            </div>
          </div>

          <div className="payment-summary">
            <div>
              <span className="payment-summary__label">Servicio</span>
              <strong className="payment-summary__value">#{payment.service_id}</strong>
            </div>
            <div>
              <span className="payment-summary__label">Monto</span>
              <strong className="payment-summary__value">
                {payment.monto ? `${payment.monto.toLocaleString("es-AR")}` : "—"} {payment.moneda}
              </strong>
            </div>
            <div>
              <span className="payment-summary__label">Gateway</span>
                <strong className="payment-summary__value">{payment.gateway ?? "—"}</strong>
            </div>
          </div>

          <div className="payment-actions">
            <button className="btn btn--primary" onClick={onInitiate} disabled={initiating}>
              {initiating ? "Abriendo pasarela…" : "Ir a pagar"}
            </button>
            <button className="btn" onClick={onSimulateComplete} disabled={completing}>
              {completing ? "Procesando…" : "Marcar como pagado"}
            </button>
            <button className="btn btn--ghost" onClick={() => nav(-1)}>
              Volver
            </button>
          </div>
          <p className="muted-small payment-footnote">
            Si cerraste la pasarela antes de tiempo, podés volver a abrirla usando “Ir a pagar”.
          </p>
        </div>
      </div>
    </section>
  );
}
