import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Scissors, MapPin, Instagram, Clock, User, ShoppingBag, ArrowRight, Target,
  Eye, Heart, ChevronRight, Menu, X, Phone, Star, Calendar, Sparkles,
  Plus, Minus, Trash2, MessageCircle, Images, ChevronLeft,
  Badge,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Tenant {
  id: string; name: string; slug: string; description: string | null;
  welcomeMessage: string | null; address: string | null; instagram: string | null;
  phone: string | null; themeColor: string | null; logoUrl: string | null;
  coverUrl: string | null; siteCoverUrl: string | null; mission: string | null;
  vision: string | null; values: string | null; aboutTitle: string | null;
  feature1Title: string | null; feature1Description: string | null;
  feature2Title: string | null; feature2Description: string | null;
  feature3Title: string | null; feature3Description: string | null;
  experienceYears: string | null; showProducts: boolean; showServices: boolean; showTeam: boolean;
  siteTemplate: string | null; galleryImages: string | null;
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const priceStr = (v: number | string) =>
  `R$ ${parseFloat(String(v)).toFixed(2).replace(".", ",")}`;

function useGallery(raw: string | null) {
  try { const arr = JSON.parse(raw || "[]"); return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

// ── Shared Navbar ─────────────────────────────────────────────────────────────
function Navbar({ tenant, slug, bookingUrl, scrolled, themeColor, dark = false, products, services }: any) {
  const [open, setOpen] = useState(false);
  const textCls = dark
    ? scrolled ? "text-zinc-900" : "text-white"
    : scrolled ? "text-zinc-900" : "text-white";
  const subCls = dark
    ? scrolled ? "text-zinc-500 hover:text-zinc-900" : "text-white/70 hover:text-white"
    : scrolled ? "text-zinc-500 hover:text-zinc-900" : "text-white/70 hover:text-white";

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-zinc-100" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to={`/${slug}`} className="flex items-center gap-2.5">
            {tenant.logoUrl
              ? <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 object-contain rounded-lg" />
              : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: scrolled ? themeColor : "rgba(255,255,255,0.15)" }}><Scissors size={15} /></div>
            }
            <span className={`font-black text-base tracking-tight transition-colors ${textCls}`}>{tenant.name}</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <a href="#sobre" className={`text-xs font-bold transition-colors uppercase tracking-wider ${subCls}`}>Quem Somos</a>
            {tenant.showServices !== false && <a href="#servicos" className={`text-xs font-bold transition-colors uppercase tracking-wider ${subCls}`}>Serviços</a>}
            {tenant.showProducts !== false && products.length > 0 && <a href="#produtos" className={`text-xs font-bold transition-colors uppercase tracking-wider ${subCls}`}>Produtos</a>}
            {tenant.showTeam !== false && <a href="#equipe" className={`text-xs font-bold transition-colors uppercase tracking-wider ${subCls}`}>Equipe</a>}
            <a href="#galeria" className={`text-xs font-bold transition-colors uppercase tracking-wider ${subCls}`}>Galeria</a>
            <Link
              to={bookingUrl}
              className="px-5 py-2 text-xs font-bold rounded-full shadow-md hover:opacity-90 active:scale-95 transition-all text-white"
              style={{ backgroundColor: scrolled ? themeColor : "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", border: scrolled ? "none" : "1px solid rgba(255,255,255,0.3)" }}
            >
              Agendar Agora
            </Link>
          </div>

          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-zinc-700 hover:bg-zinc-100" : "text-white hover:bg-white/10"}`}
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/40" onClick={() => setOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }} className="fixed top-0 right-0 bottom-0 z-[70] w-72 bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
                <span className="font-black text-zinc-900">{tenant.name}</span>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100"><X size={20} /></button>
              </div>
              <div className="flex flex-col gap-1 p-4 flex-1">
                {[
                  { label: "Quem Somos", href: "#sobre" },
                  ...(tenant.showServices !== false ? [{ label: "Serviços", href: "#servicos" }] : []),
                  ...(tenant.showProducts !== false && products.length > 0 ? [{ label: "Produtos", href: "#produtos" }] : []),
                  ...(tenant.showTeam !== false ? [{ label: "Equipe", href: "#equipe" }] : []),
                  { label: "Galeria", href: "#galeria" },
                ].map(item => (
                  <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="px-4 py-3 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors">{item.label}</a>
                ))}
              </div>
              <div className="p-4 border-t border-zinc-100">
                <Link to={bookingUrl} onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 w-full py-3.5 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all" style={{ backgroundColor: themeColor }}>
                  <Calendar size={16} /> Agendar Horário
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Shared Gallery Section ────────────────────────────────────────────────────
function GallerySection({ images, themeColor, dark = false }: { images: string[]; themeColor: string; dark?: boolean }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (!images.length) return null;

  const bg = dark ? "bg-zinc-950" : "bg-zinc-50";
  const title = dark ? "text-white" : "text-zinc-900";
  const sub = dark ? "text-zinc-400" : "text-zinc-500";

  return (
    <section id="galeria" className={`py-20 md:py-28 ${bg}`}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="mb-10">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest mb-4 ${dark ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-500 bg-white"}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
            Galeria
          </div>
          <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${title}`}>Nossa galeria</h2>
          <p className={`mt-2 text-sm ${sub}`}>Conheça nosso espaço e alguns dos nossos trabalhos.</p>
        </div>

        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {images.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="break-inside-avoid cursor-pointer overflow-hidden rounded-2xl group"
              onClick={() => setLightbox(i)}
            >
              <img src={src} alt={`Galeria ${i + 1}`} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => setLightbox(null)}><X size={20} /></button>
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={e => { e.stopPropagation(); setLightbox(l => l !== null ? (l - 1 + images.length) % images.length : null); }}><ChevronLeft size={20} /></button>
            <motion.img key={lightbox} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={images[lightbox]} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" onClick={e => { e.stopPropagation(); setLightbox(l => l !== null ? (l + 1) % images.length : null); }}><ChevronRight size={20} /></button>
            <p className="absolute bottom-4 text-white/40 text-xs font-medium">{lightbox + 1} / {images.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ── Shared Cart + Products ───────────────────────────────────────────────────
function useCart() {
  const [cartItems, setCartItems] = useState<{ product: any; quantity: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.quantity * parseFloat(i.product.salePrice), 0);

  const addToCart = (product: any) => setCartItems(prev => {
    const idx = prev.findIndex(i => i.product.id === product.id);
    if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], quantity: n[idx].quantity + 1 }; return n; }
    return [...prev, { product, quantity: 1 }];
  });
  const changeQty = (id: string, delta: number) => setCartItems(prev =>
    prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0)
  );
  const removeFromCart = (id: string) => setCartItems(prev => prev.filter(i => i.product.id !== id));

  return { cartItems, cartOpen, setCartOpen, cartCount, cartTotal, addToCart, changeQty, removeFromCart };
}

function CartDrawer({ cartItems, cartOpen, setCartOpen, cartTotal, cartCount, changeQty, removeFromCart, themeColor, phone }: any) {
  const handleWhatsapp = () => {
    const clean = phone.replace(/\D/g, "");
    const lines = cartItems.map((i: any) => `• ${i.product.name} x${i.quantity} — ${priceStr(i.product.salePrice * i.quantity)}`).join("\n");
    window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(`Olá! Quero fazer um pedido:\n\n${lines}\n\n*Total: ${priceStr(cartTotal)}*`)}`);
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} style={{ color: themeColor }} />
                <h2 className="font-black text-zinc-900">Carrinho</h2>
                {cartCount > 0 && <span className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center" style={{ backgroundColor: themeColor }}>{cartCount}</span>}
              </div>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cartItems.length === 0
                ? <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400"><ShoppingBag size={40} className="opacity-30" /><p className="text-sm font-medium">Carrinho vazio</p></div>
                : cartItems.map(({ product, quantity }: any) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    {product.photo ? <img src={product.photo} alt={product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0 text-zinc-400"><ShoppingBag size={16} /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 line-clamp-1">{product.name}</p>
                      <p className="text-xs font-black" style={{ color: themeColor }}>{priceStr(product.salePrice * quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => changeQty(product.id, -1)} className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center hover:border-zinc-400"><Minus size={10} /></button>
                      <span className="text-sm font-black text-zinc-900 w-5 text-center">{quantity}</span>
                      <button onClick={() => changeQty(product.id, 1)} className="w-6 h-6 rounded-md text-white flex items-center justify-center" style={{ backgroundColor: themeColor }}><Plus size={10} /></button>
                      <button onClick={() => removeFromCart(product.id)} className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-red-400 hover:bg-red-50 ml-1"><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))
              }
            </div>
            {cartItems.length > 0 && (
              <div className="px-5 py-5 border-t border-zinc-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 font-medium">Total</span>
                  <span className="text-xl font-black text-zinc-900">{priceStr(cartTotal)}</span>
                </div>
                {phone
                  ? <button onClick={handleWhatsapp} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg" style={{ backgroundColor: "#25D366" }}><MessageCircle size={18} />Enviar pedido pelo WhatsApp</button>
                  : <p className="text-xs text-zinc-400 text-center">Entre em contato para finalizar o pedido.</p>
                }
                <button onClick={() => { }} className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors">Limpar carrinho</button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Shared Footer ────────────────────────────────────────────────────────────
function Footer({ tenant, slug, bookingUrl, themeColor, products, dark = false }: any) {
  return (
    <footer className={dark ? "bg-black text-white" : "bg-zinc-950 text-white"}>
      <div className="max-w-6xl mx-auto px-5 pt-16 pb-24 md:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              {tenant.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 object-contain rounded-lg" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10"><Scissors size={15} className="text-white" /></div>}
              <span className="font-black text-base">{tenant.name}</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed mb-5">{tenant.description ? tenant.description.slice(0, 100) + (tenant.description.length > 100 ? "..." : "") : "Referência em beleza e bem-estar."}</p>
            <div className="flex gap-3">
              {tenant.instagram && <a href={tenant.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"><Instagram size={15} /></a>}
              {tenant.phone && <a href={`tel:${tenant.phone}`} className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"><Phone size={15} /></a>}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Navegação</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><a href="#sobre" className="hover:text-white transition-colors">Quem Somos</a></li>
              {tenant.showServices !== false && <li><a href="#servicos" className="hover:text-white transition-colors">Serviços</a></li>}
              {tenant.showProducts !== false && products.length > 0 && <li><a href="#produtos" className="hover:text-white transition-colors">Produtos</a></li>}
              {tenant.showTeam !== false && <li><a href="#equipe" className="hover:text-white transition-colors">Equipe</a></li>}
              <li><a href="#galeria" className="hover:text-white transition-colors">Galeria</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Informações</h4>
            <ul className="space-y-3 text-sm text-zinc-500">
              {tenant.address && <li className="flex items-start gap-2"><MapPin size={15} className="shrink-0 text-zinc-400 mt-0.5" /><span>{tenant.address}</span></li>}
              {tenant.phone && <li className="flex items-center gap-2"><Phone size={15} className="shrink-0 text-zinc-400" /><span>{tenant.phone}</span></li>}
              <li className="flex items-center gap-2"><Clock size={15} className="shrink-0 text-zinc-400" /><span>Seg–Sáb: 09h às 20h</span></li>
            </ul>
          </div>
          <div>
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900">
              <h4 className="font-black text-base mb-2">Agende agora</h4>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">Escolha seu profissional e serviço em segundos.</p>
              <Link to={bookingUrl} className="flex items-center justify-center gap-2 w-full py-3 font-bold text-sm rounded-xl text-zinc-950 hover:bg-zinc-100 active:scale-95 transition-all bg-white"><Calendar size={14} /> Ir para Agenda</Link>
            </div>
          </div>
        </div>
        <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest">© {new Date().getFullYear()} {tenant.name} · Desenvolvido por <span className="text-zinc-400">Agendelle</span></p>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — ELEGANT CLASSIC (Premium Minimalist, clean, soft shadows)
// ─────────────────────────────────────────────────────────────────────────────
function TemplateClassic({ tenant, professionals, services, products, galleryImages, slug, bookingUrl, themeColor, scrolled }: any) {
  const { cartItems, cartOpen, setCartOpen, cartCount, cartTotal, addToCart, changeQty, removeFromCart } = useCart();
  const heroImage = tenant.siteCoverUrl || tenant.coverUrl;

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      <Navbar tenant={tenant} slug={slug} bookingUrl={bookingUrl} scrolled={scrolled} themeColor={themeColor} products={products} services={services} />

      {/* Hero — Luxury Split */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-zinc-100/50 hidden lg:block" />
        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-sm border border-zinc-100 text-[10px] font-black uppercase tracking-[0.2em] mb-8" style={{ color: themeColor }}>
                <Sparkles size={10} /> {tenant.name}
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95] mb-8 text-zinc-950">
                {tenant.welcomeMessage || "Sua melhor versão começa aqui."}
              </h1>
              <p className="text-lg text-zinc-500 leading-relaxed mb-10 font-medium">
                {tenant.description || "Experiência premium em beleza e bem-estar, pensada em cada detalhe para você."}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to={bookingUrl} 
                  className="px-8 py-4 rounded-2xl font-black text-sm shadow-2xl shadow-zinc-950/10 hover:translate-y-[-2px] transition-all active:scale-95 text-white" 
                  style={{ backgroundColor: themeColor }}
                >
                  Agendar Agora
                </Link>
                {tenant.instagram && (
                  <a href={tenant.instagram} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-2xl font-black text-sm border border-zinc-200 bg-white hover:bg-zinc-50 transition-all active:scale-95 text-zinc-900">
                    Instagram
                  </a>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-zinc-100">
                <div>
                  <p className="text-3xl font-black text-zinc-950">{tenant.experienceYears || "10+"}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Anos</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-zinc-950">{professionals.length}+</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Especialistas</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-zinc-950">{services.length}+</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Serviços</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }} 
              animate={{ opacity: 1, scale: 1, rotate: 0 }} 
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border-8 border-white">
                {heroImage ? (
                  <img src={heroImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-50 flex items-center justify-center">
                    <Scissors size={120} className="text-zinc-100" />
                  </div>
                )}
              </div>
              {/* Floating element */}
              <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-3xl shadow-2xl border border-zinc-50 max-w-[200px]">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} fill={themeColor} color={themeColor} />)}
                </div>
                <p className="text-xs font-bold text-zinc-900 leading-snug">"Atendimento impecável e ambiente maravilhoso. Recomendo!"</p>
                <p className="text-[9px] font-black text-zinc-400 uppercase mt-2">— Cliente Satisfeito</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services — Horizontal Scroll / Grid */}
      {tenant.showServices !== false && (
        <section id="servicos" className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="max-w-xl">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 block">Especialidades</span>
                <h2 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tight">Serviços Exclusivos</h2>
              </div>
              <Link to={bookingUrl} className="text-sm font-black uppercase tracking-widest hover:translate-x-1 transition-transform" style={{ color: themeColor }}>Ver todos <ArrowRight className="inline-block ml-1" size={16} /></Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.slice(0, 6).map((service: any, i: number) => (
                <motion.div 
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-[#fafafa] rounded-[2rem] p-8 hover:bg-white hover:shadow-2xl hover:shadow-zinc-950/5 transition-all duration-500 border border-transparent hover:border-zinc-100"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 shadow-sm" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
                    <Scissors size={20} />
                  </div>
                  <h3 className="text-xl font-black text-zinc-950 mb-3">{service.name}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-8 line-clamp-2">{service.description || "Tratamento de alto padrão realizado por nossos especialistas."}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-zinc-200/50">
                    <div>
                      <p className="text-lg font-black text-zinc-950">R$ {service.price}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">{service.duration} min</p>
                    </div>
                    <Link to={bookingUrl} className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-zinc-200 text-zinc-400 hover:text-white transition-all duration-300 hover:bg-zinc-900">
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      <GallerySection images={galleryImages} themeColor={themeColor} />

      {/* Team */}
      {tenant.showTeam !== false && professionals.length > 0 && (
        <section id="equipe" className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 block">Nosso Time</span>
            <h2 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tight mb-20">Especialistas Certificados</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {professionals.map((prof: any, i: number) => (
                <motion.div 
                  key={prof.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group"
                >
                  <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-zinc-50 mb-6 relative shadow-lg shadow-zinc-950/5 border-4 border-white">
                    {prof.photo ? (
                      <img src={prof.photo} alt={prof.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-200">{prof.name.charAt(0)}</div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                      <Link to={`${bookingUrl}?profId=${prof.id}`} className="w-full py-3 bg-white rounded-xl text-xs font-black text-zinc-950 shadow-xl">AGENDAR</Link>
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-zinc-950">{prof.name}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">{prof.role || "Especialista"}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <CartDrawer cartItems={cartItems} cartOpen={cartOpen} setCartOpen={setCartOpen} cartTotal={cartTotal} cartCount={cartCount} changeQty={changeQty} removeFromCart={removeFromCart} themeColor={themeColor} phone={tenant.phone} />
      <Footer tenant={tenant} slug={slug} bookingUrl={bookingUrl} themeColor={themeColor} products={products} />
      
      {/* Mobile CTA */}
      <div className="fixed bottom-6 left-6 right-6 z-50 md:hidden">
        <div className="flex gap-3">
          {cartCount > 0 && (
            <button onClick={() => setCartOpen(true)} className="h-14 w-14 rounded-2xl bg-white shadow-2xl border border-zinc-100 flex items-center justify-center relative text-zinc-900">
              <ShoppingBag size={20} />
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{cartCount}</span>
            </button>
          )}
          <Link to={bookingUrl} className="flex-1 h-14 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-2xl" style={{ backgroundColor: themeColor }}>
            <Calendar size={18} /> AGENDAR AGORA
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — LUXURY NOIR (Dark mode, glassmorphism, glowing accents)
// ─────────────────────────────────────────────────────────────────────────────
function TemplateDark({ tenant, professionals, services, products, galleryImages, slug, bookingUrl, themeColor, scrolled }: any) {
  const { cartItems, cartOpen, setCartOpen, cartCount, cartTotal, addToCart, changeQty, removeFromCart } = useCart();
  const heroImage = tenant.siteCoverUrl || tenant.coverUrl;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-white selection:text-black">
      <Navbar tenant={tenant} slug={slug} bookingUrl={bookingUrl} scrolled={scrolled} themeColor={themeColor} products={products} services={services} dark />

      {/* Hero — Immersive Dark */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px]" style={{ backgroundColor: themeColor }} />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-10 blur-[120px]" style={{ backgroundColor: themeColor }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-10">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70">Experiência Premium</span>
            </div>
            
            <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] mb-8 uppercase">
              {tenant.name}
            </h1>
            
            <p className="text-xl md:text-2xl text-white/50 font-medium max-w-2xl mx-auto mb-14 leading-relaxed italic">
              "{tenant.welcomeMessage || "Onde a excelência encontra a sofisticação."}"
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link 
                to={bookingUrl} 
                className="group relative px-12 py-5 rounded-full font-black text-sm uppercase tracking-widest overflow-hidden transition-all active:scale-95"
                style={{ backgroundColor: themeColor, color: '#000' }}
              >
                <span className="relative z-10">Agendar Agora</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
              </Link>
              {tenant.instagram && (
                <a href={tenant.instagram} target="_blank" rel="noopener noreferrer" className="px-12 py-5 rounded-full font-black text-sm uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all active:scale-95">
                  Instagram
                </a>
              )}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </section>

      {/* Services — Luxury List */}
      {tenant.showServices !== false && (
        <section id="servicos" className="py-40 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-[1fr_2fr] gap-20">
              <div>
                <div className="sticky top-32">
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 block text-white/30">Menu de Serviços</span>
                  <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-none mb-8">Nossas<br/>Especialidades</h2>
                  <p className="text-lg text-white/40 leading-relaxed font-medium">Oferecemos o que há de mais moderno em técnicas e produtos para garantir o resultado que você merece.</p>
                  <div className="mt-12 w-20 h-1 rounded-full" style={{ backgroundColor: themeColor }} />
                </div>
              </div>

              <div className="space-y-4">
                {services.slice(0, 8).map((service: any, i: number) => (
                  <motion.div 
                    key={service.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: themeColor }} />
                    <div className="flex items-center justify-between gap-6 relative z-10">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl md:text-2xl font-black tracking-tight group-hover:translate-x-2 transition-transform duration-500">{service.name}</h3>
                          {service.isFeatured && <Badge color="warning" className="text-[8px] px-2 py-0.5">TOP</Badge>}
                        </div>
                        <p className="text-sm text-white/40 font-medium line-clamp-1">{service.description || "Atendimento personalizado com os melhores produtos do mercado."}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-black group-hover:scale-110 transition-transform duration-500" style={{ color: themeColor }}>R$ {service.price}</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">{service.duration} MIN</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <Plus size={20} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Gallery — Immersive Grid */}
      <GallerySection images={galleryImages} themeColor={themeColor} dark />

      {/* Team — Minimal Luxe */}
      {tenant.showTeam !== false && professionals.length > 0 && (
        <section id="equipe" className="py-40 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 block text-white/30">Mestres</span>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-24 uppercase">Nosso Time</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
              {professionals.map((prof: any, i: number) => (
                <motion.div 
                  key={prof.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group text-left"
                >
                  <div className="aspect-[4/5] rounded-[3rem] overflow-hidden bg-white/5 mb-8 relative grayscale group-hover:grayscale-0 transition-all duration-700">
                    {prof.photo ? (
                      <img src={prof.photo} alt={prof.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white/5">{prof.name.charAt(0)}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col justify-end h-1/2">
                       <Link to={`${bookingUrl}?profId=${prof.id}`} className="w-full py-4 rounded-full bg-white text-black font-black text-[10px] tracking-widest uppercase scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 shadow-2xl">RESERVAR</Link>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">{prof.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mt-2" style={{ color: themeColor }}>{prof.role || "Especialista"}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <CartDrawer cartItems={cartItems} cartOpen={cartOpen} setCartOpen={setCartOpen} cartTotal={cartTotal} cartCount={cartCount} changeQty={changeQty} removeFromCart={removeFromCart} themeColor={themeColor} phone={tenant.phone} />
      <Footer tenant={tenant} slug={slug} bookingUrl={bookingUrl} themeColor={themeColor} products={products} dark />
      
      {/* Mobile CTA */}
      <div className="fixed bottom-6 left-6 right-6 z-50 md:hidden">
        <div className="flex gap-3">
          <Link to={bookingUrl} className="flex-1 h-16 rounded-full text-black font-black text-xs flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-95 transition-all" style={{ backgroundColor: themeColor }}>
            <Calendar size={20} /> AGENDAR AGORA
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3 — MODERN ORGANIC (Glassmorphism, soft colors, zen vibes)
// ─────────────────────────────────────────────────────────────────────────────
function TemplateBold({ tenant, professionals, services, products, galleryImages, slug, bookingUrl, themeColor, scrolled }: any) {
  const { cartItems, cartOpen, setCartOpen, cartCount, cartTotal, addToCart, changeQty, removeFromCart } = useCart();
  const heroImage = tenant.siteCoverUrl || tenant.coverUrl;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white overflow-x-hidden">
      <Navbar tenant={tenant} slug={slug} bookingUrl={bookingUrl} scrolled={scrolled} themeColor={themeColor} products={products} services={services} />

      {/* Hero — Modern Glass */}
      <section className="relative min-h-[95vh] flex items-center pt-20">
        {/* Background shapes */}
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: themeColor }} />
        <div className="absolute bottom-[5%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[80px] opacity-10 pointer-events-none" style={{ backgroundColor: themeColor }} />

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-[2px] rounded-full" style={{ backgroundColor: themeColor }} />
                <span className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Modern & Professional</span>
              </div>
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.9] mb-10 text-zinc-950">
                {tenant.name}<span className="inline-block w-4 h-4 rounded-full ml-4" style={{ backgroundColor: themeColor }} />
              </h1>
              <p className="text-xl md:text-2xl text-zinc-500 leading-relaxed max-w-xl mb-12 font-medium">
                {tenant.welcomeMessage || "Redefinindo o conceito de autocuidado com tecnologia e arte."}
              </p>
              <div className="flex flex-col sm:flex-row gap-5">
                <Link 
                  to={bookingUrl} 
                  className="group h-16 px-10 rounded-2xl bg-zinc-950 text-white font-black text-sm flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 active:scale-95"
                >
                  <Calendar size={20} /> AGENDAR HORÁRIO
                </Link>
                <button className="h-16 px-10 rounded-2xl bg-white border border-zinc-200 text-zinc-900 font-black text-sm hover:border-zinc-400 transition-all active:scale-95">
                  VER SERVIÇOS
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square rounded-[4rem] overflow-hidden shadow-2xl relative z-10">
                {heroImage ? (
                  <img src={heroImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
                     <Sparkles size={80} className="text-zinc-300" />
                  </div>
                )}
              </div>
              {/* Glass accents */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/40 shadow-xl z-20 flex flex-col items-center justify-center text-center p-4">
                 <p className="text-2xl font-black text-zinc-900 leading-none mb-1">5.0</p>
                 <div className="flex gap-0.5 mb-2">
                    {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="#fbbf24" color="#fbbf24" />)}
                 </div>
                 <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Avaliações Google</p>
              </div>
              <div className="absolute -bottom-10 -left-10 w-48 h-24 bg-white/40 backdrop-blur-3xl rounded-[2rem] border border-white/40 shadow-xl z-20 flex items-center justify-center gap-4 px-6">
                 <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: themeColor }}>
                    <Heart size={20} />
                 </div>
                 <div>
                    <p className="text-xs font-black text-zinc-900 leading-tight">Cuidado Especial</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Atendimento VIP</p>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Services — Grid Cards */}
      {tenant.showServices !== false && (
        <section id="servicos" className="py-40 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-24">
              <h2 className="text-5xl md:text-6xl font-black tracking-tight text-zinc-950 mb-6">Explore nossas artes</h2>
              <p className="text-lg text-zinc-500 font-medium">Cada serviço é uma obra de arte personalizada para o seu estilo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {services.slice(0, 8).map((service: any, i: number) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative bg-[#f8f9fa] rounded-[3rem] p-10 hover:bg-white hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transition-all duration-700 border border-transparent hover:border-zinc-100"
                >
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500" style={{ color: themeColor }}>
                    <Scissors size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-950 mb-4">{service.name}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-8">{service.description || "Referência em qualidade e satisfação."}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-zinc-900">R$ {service.price}</span>
                    <Link to={bookingUrl} className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                       <Plus size={24} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team — Minimal & Round */}
      {tenant.showTeam !== false && professionals.length > 0 && (
        <section id="equipe" className="py-40 bg-zinc-50/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-end justify-between mb-20">
              <div className="max-w-xl">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] mb-4 block">Especialistas</span>
                <h2 className="text-5xl font-black text-zinc-950 tracking-tight">O time que transforma</h2>
              </div>
              <p className="text-sm text-zinc-500 font-medium max-w-xs md:text-right">Profissionais apaixonados por elevar sua autoestima e bem-estar.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
              {professionals.map((prof: any, i: number) => (
                <motion.div 
                  key={prof.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group"
                >
                  <div className="aspect-[3/4] rounded-[3rem] overflow-hidden bg-zinc-200 mb-8 relative">
                    {prof.photo ? (
                      <img src={prof.photo} alt={prof.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl font-black text-zinc-400 bg-zinc-200">{prof.name.charAt(0)}</div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-8">
                       <Link to={`${bookingUrl}?profId=${prof.id}`} className="w-full py-4 bg-white rounded-2xl text-xs font-black text-zinc-950 shadow-2xl tracking-widest text-center">RESERVAR</Link>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-zinc-950 mb-1">{prof.name}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{prof.role || "Especialista"}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products — Minimal Shop */}
      {tenant.showProducts !== false && products.length > 0 && (
        <section id="produtos" className="py-40 bg-white">
          <div className="max-w-7xl mx-auto px-6">
             <div className="flex items-center justify-between mb-20">
                <h2 className="text-5xl font-black tracking-tight text-zinc-950">Vitrine Shop</h2>
                <button onClick={() => setCartOpen(true)} className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-950 text-white shadow-xl hover:scale-110 transition-transform">
                   <ShoppingBag size={22} />
                   {cartCount > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
                </button>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                {products.map((product: any) => {
                  const inCart = cartItems.find(i => i.product.id === product.id);
                  return (
                    <div key={product.id} className="group">
                       <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-[#f8f9fa] mb-6 relative border border-transparent group-hover:border-zinc-200 transition-all">
                          {product.photo ? (
                            <img src={product.photo} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-200"><ShoppingBag size={40} /></div>
                          )}
                          <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-all">
                             {inCart ? (
                                <div className="w-full bg-white rounded-2xl p-2 flex items-center justify-between shadow-2xl">
                                   <button onClick={() => changeQty(product.id, -1)} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900"><Minus size={14} /></button>
                                   <span className="text-sm font-black text-zinc-900">{inCart.quantity}</span>
                                   <button onClick={() => changeQty(product.id, 1)} className="w-8 h-8 rounded-xl bg-zinc-950 flex items-center justify-center text-white"><Plus size={14} /></button>
                                </div>
                             ) : (
                                <button onClick={() => addToCart(product)} className="w-full py-3 bg-zinc-950 text-white rounded-2xl text-xs font-black shadow-2xl">ADICIONAR</button>
                             )}
                          </div>
                       </div>
                       <h3 className="font-black text-zinc-950 text-sm mb-1 truncate">{product.name}</h3>
                       <p className="text-lg font-black" style={{ color: themeColor }}>R$ {product.salePrice}</p>
                    </div>
                  );
                })}
             </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      <GallerySection images={galleryImages} themeColor={themeColor} />

      {/* Experience Section */}
      <section className="py-40 relative bg-zinc-950 text-white overflow-hidden rounded-[4rem] mx-6 mb-40">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
           <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ backgroundColor: themeColor }} />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
           <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-12">Onde estilo e tradição se encontram.</h2>
           <Link to={bookingUrl} className="inline-flex h-20 px-16 rounded-3xl font-black text-lg tracking-widest flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: themeColor, color: '#000' }}>
              AGENDAR AGORA
           </Link>
        </div>
      </section>

      <CartDrawer cartItems={cartItems} cartOpen={cartOpen} setCartOpen={setCartOpen} cartTotal={cartTotal} cartCount={cartCount} changeQty={changeQty} removeFromCart={removeFromCart} themeColor={themeColor} phone={tenant.phone} />
      <Footer tenant={tenant} slug={slug} bookingUrl={bookingUrl} themeColor={themeColor} products={products} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — decide qual template renderizar
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfessionalSite() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      try {
        const tenantRes = await fetch(`/api/tenant-by-slug/${slug}`);
        if (!tenantRes.ok) { setLoading(false); return; }
        const tenantData = await tenantRes.json();
        setTenant(tenantData);
        const headers = { "x-tenant-id": tenantData.id };
        const [profRes, svcRes, prodRes] = await Promise.all([
          fetch("/api/public/professionals", { headers }),
          fetch("/api/public/services", { headers }),
          fetch("/api/public/products", { headers }),
        ]);
        if (profRes.ok) { const d = await profRes.json(); setProfessionals(Array.isArray(d) ? d.filter((p: any) => p.isActive !== false) : []); }
        if (svcRes.ok) { const d = await svcRes.json(); setServices(Array.isArray(d) ? d.filter((s: any) => s.type === "service") : []); }
        if (prodRes.ok) { const d = await prodRes.json(); setProducts(Array.isArray(d) ? d : []); }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-zinc-400">Carregando...</p>
      </div>
    </div>
  );

  if (!tenant) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50">
      <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300 mb-6"><X size={32} /></div>
      <h1 className="text-3xl font-black text-zinc-900 mb-2">Não encontrado</h1>
      <p className="text-zinc-500 mb-8 max-w-xs text-sm">Este estabelecimento não foi encontrado ou está indisponível.</p>
      <button onClick={() => navigate("/")} className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl text-sm">Voltar ao início</button>
    </div>
  );

  const themeColor = tenant.themeColor || "#18181b";
  const bookingUrl = `/${slug}/agendar`;
  const galleryImages = useGallery(tenant.galleryImages);
  const template = tenant.siteTemplate || "classic";
  const props = { tenant, professionals, services, products, galleryImages, slug, bookingUrl, themeColor, scrolled };

  if (template === "dark") return <TemplateDark {...props} />;
  if (template === "bold") return <TemplateBold {...props} />;
  return <TemplateClassic {...props} />;
}
