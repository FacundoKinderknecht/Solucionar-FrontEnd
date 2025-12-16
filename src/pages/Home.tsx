import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import "../styles/home.css";
import BecomeProviderPromo from "../components/BecomeProviderPromo";
import {
  listServices,
  listServiceImages,
  listCategories,
  getReviewSummaries,
  listServiceReviews,
  type Service,
  type Category,
  type ReviewSummary,
  type ReservationReview,
} from "../services/services";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

// Simple carousel without external deps
type DisplayCategory = { id: number; name: string; fromCatalog: boolean };
type DisplayReview = ReservationReview & { serviceId: number; serviceTitle: string };

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ratings, setRatings] = useState<Record<number, ReviewSummary>>({});
  const [showcaseReviews, setShowcaseReviews] = useState<DisplayReview[]>([]);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const nav = useNavigate();
  const catTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Fetch services (limit to 15 items for home)
    listServices().then((all) => setServices(all.slice(0, 15))).catch(()=>{});
    listCategories().then(setCategories).catch(()=>{});
  }, []);

  const [covers, setCovers] = useState<Record<number, string | undefined>>({});
  useEffect(() => {
    // Fetch cover images for visible services
    (async () => {
      const entries: [number, string | undefined][] = [];
      for (const svc of services) {
        try {
          const imgs = await listServiceImages(svc.id);
          const cover = imgs.find(i=>i.is_cover)?.url || imgs[0]?.url;
          entries.push([svc.id, cover]);
        } catch {
          /* ignore image load error */
        }
      }
      if (entries.length) {
        setCovers(Object.fromEntries(entries));
      }
    })();
  }, [services]);

  useEffect(() => {
    const ids = services.map((svc) => svc.id);
    if (!ids.length) {
      setRatings({});
      return;
    }
    getReviewSummaries(ids)
      .then((summaryList) => {
        setRatings(Object.fromEntries(summaryList.map((item) => [item.service_id, item])));
      })
      .catch(() => setRatings({}));
  }, [services]);

  useEffect(() => {
    let canceled = false;
    if (!services.length) {
      setShowcaseReviews([]);
      setActiveReviewIndex(0);
      return undefined;
    }
    (async () => {
      const portion = services.slice(0, 6);
      const aggregated: DisplayReview[] = [];
      for (const svc of portion) {
        try {
          const revs = await listServiceReviews(svc.id);
          revs.forEach((rev) => {
            aggregated.push({ ...rev, serviceId: svc.id, serviceTitle: svc.title });
          });
        } catch {
          /* ignore review fetch errors */
        }
      }
      if (!canceled) {
        setShowcaseReviews(aggregated);
        setActiveReviewIndex(0);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [services]);

  useEffect(() => {
    if (showcaseReviews.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveReviewIndex((prev) => (prev + 1) % showcaseReviews.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [showcaseReviews]);

  // Top rated placeholder: just slice existing; later can sort by rating
  // Use first 3 services for featured cards (match design)
  const featured = useMemo(() => services.slice(0, 3), [services]);

  // Build an extended category list including remote services
  const displayCategories: DisplayCategory[] = useMemo(() => {
    const base = categories.map((c) => c.name.toLowerCase());
    const extras = [
      "Psicología",
      "Terapia",
      "Clases particulares",
      "Idiomas",
      "Programación",
      "Diseño gráfico",
      "Marketing",
      "Asesoría legal",
      "Contabilidad",
      "Finanzas",
      "Soporte técnico",
      "Redacción",
      "Traducción",
      "UX/UI",
      "Data analysis",
      "Música",
      "Nutrición",
      "Entrenamiento personal",
      "Coaching",
      "Gestión de proyectos",
    ];
    const merged: DisplayCategory[] = [
      ...categories.map((c) => ({ id: c.id, name: c.name, fromCatalog: true })),
      ...extras
        .filter((e) => !base.includes(e.toLowerCase()))
        .map((e, idx) => ({ id: 10000 + idx, name: e, fromCatalog: false })),
    ];
    return merged;
  }, [categories]);

  const handleCategoryClick = useCallback((cat: DisplayCategory) => {
    if (cat.fromCatalog) {
      nav(`/services?category_id=${cat.id}`);
      return;
    }
    const params = new URLSearchParams();
    params.set("q", cat.name);
    nav(`/services?${params.toString()}`);
  }, [nav]);

  const currentReview = showcaseReviews[activeReviewIndex] ?? null;

  // Ensure wheel over track scrolls horizontally with smooth handling and prevents page scroll
  useEffect(() => {
    const el = catTrackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Only intercept when pointer is over the track element
      e.preventDefault();
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel as EventListener);
  }, []);

  // Drag-to-scroll removed; horizontal scrolling handled via wheel and arrows

  return (
    <div className="home">
      {/* Hero (match guide) */}
      <section className="hero" style={{
        padding:'4.5rem 1rem',
        background:'linear-gradient(135deg, #cfe1ff 0%, #e9f0ff 50%, #cfe1ff 100%)',
      }}>
          <div className="container" style={{maxWidth:1200, margin:'0 auto'}}>
            <div style={{maxWidth:840, textAlign:'center', margin:'0 auto'}}>
                <div style={{marginBottom:18, fontSize:56, fontWeight:900, color:'#0f172a'}}>Solucion.ar</div>
              <h1 style={{margin:0, fontSize:48, lineHeight:1.1, color:'#0f172a'}}>Tu solución para el hogar, hoy</h1>
              <p style={{marginTop:14, fontSize:18, color:'#334155'}}>Encuentra profesionales confiables para cualquier trabajo. Rápido y seguro.</p>
            </div>
          </div>
      </section>

      {/* Prompt text below banner */}
      <div className="container" style={{maxWidth:1200, margin:'0 auto', padding:'16px 1rem'}}>
        <div style={{fontSize:20, fontWeight:700}}>¿Qué necesitas hoy?</div>
      </div>

      {/* New categories row replacing floating scroller */}
      <section className="container" style={{padding:'8px 1rem'}}>
        {/* Wrapper keeps arrows fixed while inner content scrolls */}
        <div style={{position:'relative'}}>
          <div
            ref={catTrackRef}
            className="no-scrollbar"
            style={{
              display:'flex',
              gap:14,
              overflowX:'auto',
              overflowY:'hidden',
              padding:'8px 0',
              overscrollBehaviorX:'contain'
            }}
          >
          {displayCategories.map((cat) => (
            <button
              key={`${cat.fromCatalog ? "cat" : "extra"}-${cat.id}`}
              className="btn btn--ghost"
              onClick={() => handleCategoryClick(cat)}
              style={{
                whiteSpace:'nowrap',
                padding:'12px 20px',
                borderRadius:16,
                fontSize:16,
                fontWeight:600,
                background:'#fff',
                border:'1px solid #e7eaf0',
                boxShadow:'0 8px 18px rgba(13,40,112,0.08)'
              }}
            >
              {cat.name}
            </button>
          ))}
          </div>
          {/* edge fade indicators fixed relative to wrapper */}
          <div style={{position:'absolute', left:0, top:0, bottom:0, width:40, pointerEvents:'none', background:'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)'}} />
          <div style={{position:'absolute', right:0, top:0, bottom:0, width:40, pointerEvents:'none', background:'linear-gradient(270deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)'}} />
          {/* clickable arrows fixed relative to wrapper */}
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => { const el = catTrackRef.current; if (el) el.scrollTo({ left: el.scrollLeft - 320, behavior: 'smooth' }); }}
            style={{
              position:'absolute', left:4, top:'50%', transform:'translateY(-50%)',
              background:'rgba(13,40,112,0.08)', color:'#0d2870', border:'1px solid #e7eaf0',
              borderRadius:999, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 8px 16px rgba(13,40,112,0.08)'
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => { const el = catTrackRef.current; if (el) el.scrollTo({ left: el.scrollLeft + 320, behavior: 'smooth' }); }}
            style={{
              position:'absolute', right:4, top:'50%', transform:'translateY(-50%)',
              background:'rgba(13,40,112,0.08)', color:'#0d2870', border:'1px solid #e7eaf0',
              borderRadius:999, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 8px 16px rgba(13,40,112,0.08)'
            }}
          >
            ›
          </button>
        </div>
      </section>
        {/* Removed platform intro under the scroller */}

      <section className="carousel-section" style={{padding:'3rem 1rem'}}>
        <div className="container" style={{maxWidth:1280, margin:'0 auto'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
            <h2 style={{margin:0, fontSize:32}}>Servicios destacados</h2>
          </div>
          {featured.length === 0 && <p style={{color:'#777'}}>No hay servicios todavía.</p>}
          {featured.length > 0 && (
            <div className="grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:28}}>
              {featured.map(svc => (
                <div key={svc.id} className="card" style={{border:'1px solid #e7eaf0', borderRadius:16, background:'#fff', boxShadow:'0 10px 24px rgba(13,40,112,0.08)', overflow:'hidden', display:'flex', flexDirection:'column'}}>
                  <div style={{aspectRatio:'4/3', background:'#f4f6f8'}}>
                    {covers[svc.id] ? (
                      <img src={covers[svc.id]} alt="" style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}} />
                    ) : (
                      <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#9aa3ad'}}>Sin imagen</div>
                    )}
                  </div>
                  <div style={{padding:20, display:'flex', flexDirection:'column', gap:0, flexGrow:1}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                      <div style={{display:'flex', alignItems:'center', gap:8, minHeight:48}}>
                        <div style={{fontWeight:800, fontSize:20}}>{svc.title}</div>
                      </div>
                      <span
                        style={{fontSize:13, background:'#eef2ff', color:'#0d2870', borderRadius:999, padding:'6px 10px', display:'inline-flex', alignItems:'center', gap:6}}
                        title={ratings[svc.id]?.count ? `${ratings[svc.id].count} reseñas` : "Sin reseñas"}
                      >
                        <span style={{color:'#f59e0b'}}>★</span>
                        {ratings[svc.id]?.count ? ratings[svc.id].average.toFixed(1) : "Nuevo"}
                      </span>
                    </div>
                    {/* Removed preview to avoid duplication; details section below */}
                    <div style={{marginBottom:12}}>
                      <div style={{fontWeight:600, marginBottom:8}}>Detalles del servicio</div>
                      <div style={{fontSize:13, color:'#667085', minHeight:64}}>
                        {svc.description}
                      </div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:15, color:'#667085'}}>
                      <span>Desde <strong style={{color:'#0d2870'}}>{svc.price_to_agree? 'Precio a convenir' : `${svc.currency} ${svc.price.toLocaleString()}`}</strong></span>
                      <span>{svc.duration_min === 0? 'Duración indefinida' : `${svc.duration_min} min`}</span>
                    </div>
                    <div style={{marginTop:14, display:'flex', justifyContent:'center'}}>
                      <Link to={`/services/${svc.id}`} className="btn btn--primary" style={{width:300, padding:'7px 16px', fontSize:15, textAlign:'center'}}>
                        Reservar ahora
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works" style={{padding:'4rem 1rem', background:'#fff'}}>
        <div className="container" style={{maxWidth:1280, margin:'0 auto'}}>
          <h2 style={{textAlign:'center', marginBottom:28, fontSize:30}}>Cómo funciona</h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:22}}>
            {[{t:'Pide el servicio',d:'Cuéntanos qué necesitas y tu zona.'},{t:'Te conectamos',d:'Encontramos profesionales cercanos.'},{t:'Trabajo realizado',d:'Llega el técnico y soluciona.'},{t:'Paga y califica',d:'Cierra seguro y deja tu reseña.'}].map((s,i)=> (
              <div key={i} style={{border:'1px solid #e7eaf0', borderRadius:16, padding:20, textAlign:'center', background:'#fff', boxShadow:'0 8px 20px rgba(13,40,112,0.06)'}}>
                <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:64, height:64, borderRadius:'50%', background:['#0d6efd','#22c55e','#f59e0b','#8b5cf6'][i], color:'#fff', marginBottom:10, fontWeight:800}}>{i+1}</div>
                <div style={{fontWeight:800, marginBottom:10, fontSize:18}}>{s.t}</div>
                <div style={{fontSize:15, color:'#556'}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Removed CTA gradient band */}

      {/* Reviews spotlight */}
      <section style={{padding:'3.5rem 1rem', background:'#f8fafc'}}>
        <div className="container" style={{maxWidth:980, margin:'0 auto'}}>
          <h2 style={{margin:'0 0 18px 0', fontSize:30}}>Lo que dicen nuestros clientes</h2>
          {!currentReview ? (
            <div className="card" style={{padding:32, textAlign:'center'}}>
              <p className="muted">Todavía no hay reseñas públicas para mostrar.</p>
            </div>
          ) : (
            <div className="review-carousel card">
              <div className="review-card__quote">
                “{currentReview.comment?.trim() || "Sin comentario"}”
              </div>
              <div className="review-card__rating">
                <span>
                  {"★".repeat(currentReview.rating)}
                  {"☆".repeat(5 - currentReview.rating)}
                </span>
                <p className="muted-small">{currentReview.rating} / 5</p>
              </div>
              <div className="review-card__meta">
                <div>
                  <strong style={{display:'block'}}>{currentReview.serviceTitle}</strong>
                  <span className="muted-small">Reseña del {new Date(currentReview.created_at).toLocaleDateString("es-AR")}</span>
                </div>
                <Link className="btn btn--ghost" to={`/services/${currentReview.serviceId}`}>
                  Ver servicio
                </Link>
              </div>
              <div className="review-card__footer">
                <span className="muted-small">Reserva #{currentReview.reservation_id}</span>
                <span className="muted-small">Cliente #{currentReview.client_id}</span>
              </div>
              {showcaseReviews.length > 1 && (
                <div className="review-carousel__dots">
                  {showcaseReviews.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`review-carousel__dot ${idx === activeReviewIndex ? "active" : ""}`}
                      aria-label={`Ver reseña ${idx + 1}`}
                      onClick={() => setActiveReviewIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Provider promo above footer */}
      <BecomeProviderPromo />
    </div>
  );
}
