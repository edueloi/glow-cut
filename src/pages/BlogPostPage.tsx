import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import faviconImg from "../images/system/logo-favicon.png";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  featured: boolean;
  tags: string;
  views: number;
  readTimeMinutes: number;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  category?: { id: string; name: string; slug: string; color: string };
  author?: { id: string; name: string; slug: string; photo?: string; bio?: string; role?: string; instagram?: string };
}

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags) || []; } catch { return []; }
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.96)" : "#fff",
      boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: "1px solid #f3f4f6",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <img src={faviconImg} alt="Agendelle" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <span style={{ fontWeight: 900, fontSize: 16, color: "#111" }}>Agendelle</span>
          </button>
          <span style={{ color: "#e5e7eb" }}>|</span>
          <button onClick={() => navigate("/blog")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
            Blog
          </button>
        </div>
        <button onClick={() => navigate("/login")} style={{ background: "#f59e0b", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#fff", padding: "8px 20px", borderRadius: 10 }}>
          Entrar
        </button>
      </div>
    </nav>
  );
}

function RelatedCard({ post }: { post: any }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/blog/${post.slug}`)}
      style={{ cursor: "pointer", borderRadius: 14, overflow: "hidden", background: "#fff", border: "1px solid #f3f4f6", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)"; }}
    >
      <div style={{ height: 140 }}>
        {post.coverImage ? (
          <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #fef3c7, #fde68a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28 }}>✂️</span>
          </div>
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>
        {post.category && (
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: post.category.color || "#f59e0b" }}>
            {post.category.name}
          </span>
        )}
        <h4 style={{ fontSize: 13, fontWeight: 800, color: "#111", margin: "6px 0 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {post.title}
        </h4>
      </div>
    </div>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fn = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    fetch(`/api/blog/posts/${slug}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setPost(data.post);
        setRelated(data.related || []);
        setLoading(false);

        // Registra view
        if (data.post?.id) {
          fetch(`/api/blog/posts/${data.post.id}/view`, { method: "POST" }).catch(() => {});
        }

        // Update meta tags para SEO
        const title = data.post?.seoTitle || data.post?.title || "Blog Agendelle";
        const desc = data.post?.seoDescription || data.post?.excerpt || "";
        document.title = `${title} | Blog Agendelle`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute("content", desc);
        else {
          const m = document.createElement("meta");
          m.name = "description"; m.content = desc;
          document.head.appendChild(m);
        }
      })
      .catch(() => { setLoading(false); setNotFound(true); });

    return () => { document.title = "Blog Agendelle"; };
  }, [slug]);

  const tags = parseTags(post?.tags || "[]");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'Inter', sans-serif" }}>
        <Navbar />
        <div style={{ paddingTop: 120, display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: 720, width: "100%", padding: "0 24px" }}>
            <div style={{ height: 40, background: "#f3f4f6", borderRadius: 8, marginBottom: 24, animation: "pulse 1.5s infinite" }} />
            <div style={{ height: 320, background: "#f3f4f6", borderRadius: 16, marginBottom: 32, animation: "pulse 1.5s infinite" }} />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 14, background: "#f3f4f6", borderRadius: 6, marginBottom: 12, width: `${70 + Math.random() * 30}%`, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'Inter', sans-serif" }}>
        <Navbar />
        <div style={{ paddingTop: 120, textAlign: "center", padding: "120px 24px" }}>
          <div style={{ fontSize: 64 }}>📰</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#111", margin: "16px 0 8px" }}>Artigo não encontrado</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>O artigo que você procura não existe ou foi removido.</p>
          <button onClick={() => navigate("/blog")} style={{ background: "#f59e0b", color: "#fff", border: "none", cursor: "pointer", padding: "12px 28px", borderRadius: 12, fontWeight: 800, fontSize: 14 }}>
            Ver todos os artigos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'Inter', sans-serif" }}>
      {/* Reading progress bar */}
      <div style={{ position: "fixed", top: 68, left: 0, right: 0, height: 3, zIndex: 99, background: "#f3f4f6" }}>
        <div style={{ height: "100%", background: "#f59e0b", width: `${progress}%`, transition: "width 0.1s" }} />
      </div>

      <Navbar />

      <div style={{ paddingTop: 72 }}>
        {/* ── Cover image ───────────────────────────────────────────────────── */}
        {post.coverImage && (
          <div style={{ width: "100%", maxHeight: 480, overflow: "hidden" }}>
            <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: 480, objectFit: "cover" }} />
          </div>
        )}

        {/* ── Main layout ───────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 48, alignItems: "start", paddingTop: 48, paddingBottom: 80 }}>

            {/* ── Article ─────────────────────────────────────────────────── */}
            <article>
              {/* Breadcrumb */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 12, color: "#9ca3af" }}>
                <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 12 }}>Início</button>
                <span>›</span>
                <button onClick={() => navigate("/blog")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 12 }}>Blog</button>
                {post.category && <>
                  <span>›</span>
                  <button
                    onClick={() => navigate(`/blog?category=${post.category!.slug}`)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: post.category.color || "#f59e0b", fontSize: 12, fontWeight: 700 }}
                  >
                    {post.category.name}
                  </button>
                </>}
              </div>

              {/* Category badge */}
              {post.category && (
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: post.category.color || "#f59e0b", marginBottom: 12 }}>
                  {post.category.name}
                </span>
              )}

              {/* Title */}
              <h1 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 900, color: "#111", lineHeight: 1.25, margin: "0 0 16px" }}>
                {post.title}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <p style={{ fontSize: 17, color: "#374151", lineHeight: 1.65, margin: "0 0 24px", fontWeight: 400, borderLeft: "3px solid #f59e0b", paddingLeft: 16 }}>
                  {post.excerpt}
                </p>
              )}

              {/* Meta info */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 24, borderBottom: "1px solid #f3f4f6", marginBottom: 32, flexWrap: "wrap" }}>
                {post.author && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {post.author.photo ? (
                      <img src={post.author.photo} alt={post.author.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#d97706" }}>
                        {post.author.name[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>{post.author.name}</div>
                      {post.author.role && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{post.author.role}</div>}
                    </div>
                  </div>
                )}
                <div style={{ height: 20, width: 1, background: "#e5e7eb" }} />
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{formatDate(post.publishedAt)}</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>📖 {post.readTimeMinutes} min de leitura</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>👁 {post.views.toLocaleString("pt-BR")} visualizações</span>
              </div>

              {/* Content */}
              <div
                className="blog-content"
                style={{ fontSize: 16, lineHeight: 1.75, color: "#374151" }}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Tags */}
              {tags.length > 0 && (
                <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #f3f4f6" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9ca3af", marginBottom: 12 }}>Tags</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tags.map((tag, i) => (
                      <button
                        key={i}
                        onClick={() => navigate(`/blog?search=${tag}`)}
                        style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Author bio box */}
              {post.author && post.author.bio && (
                <div style={{ marginTop: 40, background: "#fffbeb", borderRadius: 16, padding: "24px 28px", border: "1px solid #fde68a", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  {post.author.photo ? (
                    <img src={post.author.photo} alt={post.author.name} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#d97706", flexShrink: 0 }}>
                      {post.author.name[0]}
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f59e0b", margin: "0 0 4px" }}>Sobre o autor</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>{post.author.name}</p>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{post.author.bio}</p>
                    {post.author.instagram && (
                      <a href={`https://instagram.com/${post.author.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginTop: 8, display: "inline-block" }}>
                        @{post.author.instagram.replace("@", "")} →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Share */}
              <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Compartilhar:</span>
                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank")}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#1877f2" }}
                >
                  Facebook
                </button>
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, "_blank")}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#1d9bf0" }}
                >
                  Twitter/X
                </button>
                <button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(post.title + " " + window.location.href)}`, "_blank")}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#25d366" }}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#374151" }}
                >
                  Copiar link
                </button>
              </div>
            </article>

            {/* ── Sidebar ───────────────────────────────────────────────────── */}
            <aside style={{ position: "sticky", top: 88 }}>

              {/* Back to blog */}
              <button
                onClick={() => navigate("/blog")}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 12, border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 24 }}
              >
                ← Voltar ao Blog
              </button>

              {/* Newsletter */}
              <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: 16, padding: "24px 20px", color: "#fff", marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8, margin: "0 0 8px" }}>Newsletter</p>
                <h4 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 8px" }}>Receba conteúdo exclusivo</h4>
                <p style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.5, margin: "0 0 16px" }}>Dicas semanais para o seu negócio de beleza.</p>
                <NewsletterInline />
              </div>

              {/* Related posts */}
              {related.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#374151", marginBottom: 16 }}>
                    Artigos Relacionados
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {related.map(r => <RelatedCard key={r.id} post={r} />)}
                  </div>
                </div>
              )}
            </aside>
          </div>

          {/* Mobile related posts */}
          {related.length > 0 && (
            <div style={{ paddingBottom: 60, borderTop: "1px solid #f3f4f6", paddingTop: 48 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "#111", marginBottom: 24 }}>Artigos Relacionados</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 20 }}>
                {related.map(r => <RelatedCard key={r.id} post={r} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer style={{ background: "#111", color: "#9ca3af", padding: "32px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 12 }}>© 2026 Agendelle. Todos os direitos reservados.</p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4 {
          color: #111; font-weight: 900; line-height: 1.3; margin-top: 2em; margin-bottom: 0.6em;
        }
        .blog-content h2 { font-size: 1.5em; }
        .blog-content h3 { font-size: 1.25em; }
        .blog-content p { margin: 0 0 1.2em; }
        .blog-content ul, .blog-content ol { padding-left: 1.5em; margin-bottom: 1.2em; }
        .blog-content li { margin-bottom: 0.4em; }
        .blog-content blockquote {
          border-left: 3px solid #f59e0b; padding: 12px 20px;
          background: #fffbeb; margin: 1.5em 0; border-radius: 0 10px 10px 0;
          font-style: italic; color: #374151;
        }
        .blog-content img { max-width: 100%; border-radius: 12px; margin: 1.5em 0; }
        .blog-content a { color: #f59e0b; font-weight: 700; }
        .blog-content a:hover { text-decoration: underline; }
        .blog-content code {
          background: #f3f4f6; padding: 2px 6px; border-radius: 4px;
          font-family: monospace; font-size: 0.875em;
        }
        .blog-content pre {
          background: #1e293b; color: #e2e8f0; padding: 20px;
          border-radius: 12px; overflow-x: auto; margin: 1.5em 0;
        }
        .blog-content pre code { background: none; color: inherit; padding: 0; }
        .blog-content strong { color: #111; font-weight: 800; }
        .blog-content hr { border: none; border-top: 1px solid #f3f4f6; margin: 2em 0; }
        @media (max-width: 768px) {
          article { grid-column: 1 / -1 !important; }
          aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function NewsletterInline() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await fetch("/api/blog/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      setDone(true);
    } catch {}
    setLoading(false);
  };

  if (done) return <p style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>Inscrito! Obrigado 🎉</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Seu e-mail"
        onKeyDown={e => e.key === "Enter" && handle()}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "none", fontSize: 12, background: "rgba(255,255,255,0.9)", color: "#111", outline: "none" }}
      />
      <button
        onClick={handle} disabled={loading || !email}
        style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: "#111", color: "#fff", fontWeight: 800, fontSize: 12 }}
      >
        {loading ? "..." : "Assinar grátis"}
      </button>
    </div>
  );
}
