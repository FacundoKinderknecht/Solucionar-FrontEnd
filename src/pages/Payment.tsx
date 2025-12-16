import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPayment, initiatePayment, completePayment, createPayment } from "../services/payments";
import { clearToken } from "../services/api";

export default function Payment() {
  const { id } = useParams();
  const pid = Number(id);
  const loc = useLocation();
  const [payment, setPayment] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();
  const [gateway, setGateway] = useState<string>("MERCADOPAGO");

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
  const qServiceId = qs.get('service_id');
  const qReservationDatetime = qs.get('reservation_datetime');
  const qMonto = qs.get('monto');
  const qMoneda = qs.get('moneda') || 'ARS';

  const onCreateAndInitiate = async () => {
    if (!qServiceId || !qReservationDatetime) return setErr('Faltan datos de reserva');
    try {
      const payload: any = {
        service_id: Number(qServiceId),
        reservation_datetime: qReservationDatetime,
        gateway: gateway,
      };
      if (qMonto) { payload.monto = Number(qMonto); payload.moneda = qMoneda; }
      const created = await createPayment(payload);
      // initiate
      const init = await initiatePayment(created.id);
      window.open(init.payment_url, '_blank');
      // navigate to the payment page for monitoring
      window.location.href = `/payments/${created.id}`;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.startsWith('HTTP 401')) {
        clearToken();
        nav('/login');
        return;
      }
      setErr(msg);
    }
  };

  if (!pid && !qServiceId) return <div className="container"><div className="muted">Pago inválido</div></div>;
  if (err) return <div className="container"><div className="muted" style={{color:'#b00020'}}>{err}</div></div>;

  if (!pid) {
    // creation page
    return (
      <section className="section">
        <div className="container card">
          <h2>Seleccionar forma de pago</h2>
          <div>
            <div><strong>Servicio:</strong> {qServiceId}</div>
            <div><strong>Fecha/hora:</strong> {qReservationDatetime}</div>
            <div><strong>Monto:</strong> {qMonto ?? '—'} {qMoneda}</div>
          </div>
          <div style={{marginTop:12}}>
            <label>Tipo de pago</label>
            <select value={gateway} onChange={e=>setGateway(e.target.value)}>
              <option value="MERCADOPAGO">MercadoPago</option>
              <option value="CREDIT_CARD">Tarjeta de crédito</option>
              <option value="DEBIT_CARD">Tarjeta de débito</option>
              <option value="TRANSFER">Transferencia</option>
            </select>
          </div>
          <div style={{marginTop:12}}>
            <button className="btn btn--primary" onClick={onCreateAndInitiate}>Crear pago e ir a pasarela</button>
            <button className="btn btn--ghost" onClick={()=>nav(-1)} style={{marginLeft:8}}>Volver</button>
          </div>
        </div>
      </section>
    );
  }

  if (!payment) return <div className="container"><div className="muted">Cargando pago…</div></div>;

  const onInitiate = async () => {
    try {
      const res = await initiatePayment(pid);
      // open mock gateway url
      window.open(res.payment_url, "_blank");
      // refresh payment
      const p = await getPayment(pid);
      setPayment(p);
    } catch (e) { setErr((e as Error).message); }
  };

  const onSimulateComplete = async () => {
    try {
      const p = await completePayment(pid);
      setPayment(p);
      // if reservation created, navigate to my bookings
      if (p && p.reservation_id) nav('/my-bookings');
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <section className="section">
      <div className="container card">
        <h2>Pago</h2>
        <div>
          <div><strong>Pago ID:</strong> {payment.id}</div>
          <div><strong>Servicio:</strong> {payment.service_id}</div>
          <div><strong>Monto:</strong> {payment.monto ?? '—' } {payment.moneda}</div>
          <div><strong>Estado:</strong> {payment.estado}</div>
        </div>

        <div style={{marginTop:16}}>
          <button className="btn btn--primary" onClick={onInitiate}>Ir a pagar (abrir pasarela)</button>
          <button className="btn" onClick={onSimulateComplete} style={{marginLeft:8}}>Simular completar pago</button>
          <button className="btn btn--ghost" onClick={()=>nav(-1)} style={{marginLeft:8}}>Volver</button>
        </div>
      </div>
    </section>
  );
}
