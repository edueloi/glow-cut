#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  AGENDELLE — Setup inicial na VPS (rodar UMA VEZ)
#  VPS: 72.62.8.195 | Domain: agendelle.com.br
#  Run: bash setup-vps.sh
# ═══════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════"
echo "  AGENDELLE — Setup VPS"
echo "═══════════════════════════════════════"

# ── 1. Cria pasta do projeto ─────────────────────────
echo "📁 Criando /var/www/agendelle..."
mkdir -p /var/www/agendelle
mkdir -p /var/log/pm2

# ── 2. Clona o repositório ───────────────────────────
echo "📦 Clonando repositório..."
cd /var/www
git clone https://github.com/edueloi/glow-cut.git agendelle
cd /var/www/agendelle

# ── 3. Instala dependências ──────────────────────────
echo "📦 Instalando dependências..."
npm install

# ── 4. Cria o .env de produção ───────────────────────
echo "⚙️  Criando .env..."
cat > /var/www/agendelle/.env << 'ENVEOF'
DATABASE_URL="mysql://root:Edu%4006051992@localhost:3306/glow_cut_db"
NODE_ENV=production
PORT=3000
ENVEOF

echo "✅ .env criado"

# ── 5. Gera o Prisma Client ──────────────────────────
echo "🔧 Gerando Prisma Client..."
npx prisma generate

# ── 6. Roda as migrations do banco ───────────────────
echo "🗄️  Rodando migrate.js..."
npm run migrate || echo "⚠️  migrate.js não encontrado, pulando..."

# ── 7. Build do frontend (Vite) ──────────────────────
echo "🏗️  Fazendo build do frontend..."
npm run build

echo "✅ Build concluído — pasta dist/ criada"

# ── 8. Configura Nginx ───────────────────────────────
echo "🌐 Configurando Nginx..."
cp /var/www/agendelle/deploy/nginx-agendelle.conf /etc/nginx/sites-available/agendelle.com.br
ln -sf /etc/nginx/sites-available/agendelle.com.br /etc/nginx/sites-enabled/agendelle.com.br

nginx -t && systemctl reload nginx
echo "✅ Nginx configurado"

# ── 9. Inicia com PM2 ────────────────────────────────
echo "🚀 Iniciando com PM2..."
cd /var/www/agendelle
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ AGENDELLE ONLINE!"
echo "  🌐 http://agendelle.com.br"
echo "  📊 pm2 logs agendelle"
echo "═══════════════════════════════════════"
