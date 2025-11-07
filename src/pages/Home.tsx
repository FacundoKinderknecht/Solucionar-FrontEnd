import { useEffect, useState, useMemo } from "react";
import { listServices, listServiceImages, type Service } from "../services/services";
import { Link } from "react-router-dom";

// Simple carousel without external deps
export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    // Fetch services (limit to 15 items for home)
    listServices().then((all) => setServices(all.slice(0, 15))).catch(()=>{});
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

  // Top rated placeholder: just slice existing; later can sort by rating
  const slides = useMemo(() => {
    const maxSlides = 5;
    const perSlide = 3;
    const chunks: Service[][] = [];
    for (let i=0; i<services.length && chunks.length<maxSlides; i+=perSlide) {
      chunks.push(services.slice(i, i+perSlide));
    }
    return chunks;
  }, [services]);

  useEffect(()=> {
    if (slide > 0 && slide >= slides.length) setSlide(0);
  }, [slides, slide]);

  function next() { setSlide(s => (slides.length ? (s+1) % slides.length : 0)); }
  function prev() { setSlide(s => (slides.length ? (s-1+slides.length) % slides.length : 0)); }

  return (
    <div className="home">
      <section className="hero" style={{padding:'4rem 1rem', textAlign:'center'}}>
        <div className="container" style={{maxWidth:960, margin:'0 auto'}}>
          <h1 className="display" style={{marginBottom:16}}>Soluciones para tu hogar, rápido y confiable</h1>
          <p style={{fontSize:18, color:'#555', marginBottom:32}}>Encuentra profesionales verificados para reparaciones, mudanzas y más. Reserva en minutos.</p>
          <div style={{display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap'}}>
            <Link to="/services" className="btn btn--primary">Ver servicios</Link>
            <Link to="/register" className="btn btn--ghost">Registrarme</Link>
          </div>
        </div>
      </section>

      <section className="carousel-section" style={{padding:'2rem 1rem'}}>
        <div className="container" style={{maxWidth:1100, margin:'0 auto'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
            <h2 style={{margin:0}}>Servicios destacados</h2>
            {slides.length>1 && (
              <div style={{display:'flex', gap:8}}>
                <button aria-label="Anterior" className="btn btn--ghost" onClick={prev}>◀</button>
                <button aria-label="Siguiente" className="btn btn--ghost" onClick={next}>▶</button>
              </div>
            )}
          </div>
          {slides.length === 0 && <p style={{color:'#777'}}>No hay servicios todavía.</p>}
          {slides.length>0 && (
            <div className="carousel" style={{position:'relative'}}>
              <div style={{overflow:'hidden'}}>
                <div style={{display:'flex', transition:'transform .4s', transform:`translateX(-${slide * 100}%)`, width:`${slides.length * 100}%`}}>
                  {slides.map((group, gi) => (
                    <div key={gi} style={{display:'grid', gridTemplateColumns:`repeat(${group.length}, 1fr)`, gap:20, width:`${100/slides.length}%`, padding:'0 4px'}}>
                      {group.map(svc => (
                        <Link to={`/services/${svc.id}`} key={svc.id} className="card" style={{textDecoration:'none', border:'1px solid #eee', borderRadius:12, background:'#fff', boxShadow:'0 2px 4px rgba(0,0,0,0.05)', overflow:'hidden'}}>
                          <div style={{aspectRatio:'16/9', background:'#f4f6f8'}}>
                            {covers[svc.id] ? (
                              <img src={covers[svc.id]} alt="" style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}} />
                            ) : (
                              <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#9aa3ad'}}>Sin imagen</div>
                            )}
                          </div>
                          <div style={{padding:16}}>
                          <div style={{fontWeight:600, fontSize:16, marginBottom:4}}>{svc.title}</div>
                          <div style={{fontSize:13, color:'#666', marginBottom:8, lineHeight:1.4}}>{svc.description.slice(0,120)}{svc.description.length>120?'…':''}</div>
                          <div style={{fontSize:13, display:'flex', gap:12, flexWrap:'wrap'}}>
                            <span>{svc.price_to_agree? 'Precio a convenir' : `$${svc.price.toLocaleString()} ${svc.currency}`}</span>
                            <span>• {svc.duration_min === 0? 'Duración indef.' : `${svc.duration_min} min`}</span>
                            {svc.location_note && <span>• {svc.location_note}</span>}
                          </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {slides.length>1 && (
                <div style={{display:'flex', justifyContent:'center', gap:6, marginTop:12}}>
                  {slides.map((_,i)=>(
                    <button key={i} onClick={()=>setSlide(i)} style={{width:10, height:10, borderRadius:'50%', border:'none', background: i===slide? '#0d6efd':'#d0d6e0', cursor:'pointer'}} aria-label={`Ir al slide ${i+1}`}></button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works" style={{padding:'3rem 1rem', background:'#fff'}}>
        <div className="container" style={{maxWidth:1100, margin:'0 auto'}}>
          <h2 style={{textAlign:'center', marginBottom:20}}>Cómo funciona</h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16}}>
            {[{t:'Pide el servicio',d:'Cuéntanos qué necesitas y tu zona.'},{t:'Te conectamos',d:'Encontramos profesionales cercanos.'},{t:'Trabajo realizado',d:'Llega el técnico y soluciona.'},{t:'Paga y califica',d:'Cierra seguro y deja tu reseña.'}].map((s,i)=> (
              <div key={i} style={{border:'1px solid #eee', borderRadius:12, padding:16, textAlign:'center', background:'#fff'}}>
                <div style={{fontSize:13, color:'#667', marginBottom:6}}>Paso {i+1}</div>
                <div style={{fontWeight:700, marginBottom:8}}>{s.t}</div>
                <div style={{fontSize:14, color:'#555'}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book a service CTA */}
      <section style={{padding:'4rem 1rem', background:'linear-gradient(135deg,#0d6efd 0%, #001b45 100%)', color:'#fff', textAlign:'center'}}>
        <div className="container" style={{maxWidth:820, margin:'0 auto'}}>
          <h2 style={{marginBottom:12}}>¿Listo para empezar?</h2>
            <p style={{marginBottom:24, fontSize:18, lineHeight:1.4, opacity:.95}}>Reserva un servicio en minutos. Explora trabajos disponibles y encuentra tu solución.</p>
            <div style={{display:'flex', justifyContent:'center'}}>
              <Link to="/services" className="btn btn--primary" style={{background:'#fff', color:'#0d2870'}}>Ir a servicios</Link>
            </div>
        </div>
      </section>
    </div>
  );
}
