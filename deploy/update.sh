#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  AGENDELLE — Script de atualização (usar depois do git push)
#  SSH: ssh root@72.62.8.195
#  Rodar: bash /var/www/agendelle/deploy/update.sh
#
#  OU em uma linha do terminal local:
#  ssh root@72.62.8.195 "cd /var/www/agendelle && git pull && npm install && npm run build && pm2 restart agendelle"
# ═══════════════════════════════════════════════════════════════

set -e

echo "🔄 Atualizando Agendelle..."

cd /var/www/agendelle

# Puxa as últimas alterações do GitHub
git pull

# Instala novas dependências (se houver)
npm install

# Regera Prisma (caso o schema mudou)
npx prisma generate

# Build do frontend
npm run build

# Reinicia o servidor
pm2 restart agendelle --update-env

echo ""
echo "✅ Agendelle atualizado!"
echo "📊 Logs: pm2 logs agendelle --lines 50"
