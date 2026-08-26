#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  VPS IA — Acesso e deploy central (roda LOCAL, no seu PC)
#  Usa a chave ~/.ssh/vps_hostinger para acessar root@72.62.8.195
#
#  Uso:
#    bash deploy/vps.sh shell                    -> abre SSH interativo
#    bash deploy/vps.sh logs <alvo> [linhas]      -> pm2 logs <alvo>
#    bash deploy/vps.sh deploy <alvo>             -> roda o deploy do <alvo>
#    bash deploy/vps.sh deploy list               -> lista os alvos
# ═══════════════════════════════════════════════════════════════

set -e

VPS_HOST="root@72.62.8.195"
VPS_KEY="$HOME/.ssh/vps_hostinger"

ssh_vps() {
  ssh -i "$VPS_KEY" "$VPS_HOST" "$@"
}

list_targets() {
  cat <<EOF
Alvos disponíveis para 'deploy':
  mecaerp             /var/www/mecaerp
  psiflux             /var/www/psiflux (+ backend, migrate/patch)
  agendelle           ~/agendelle (com prisma generate + migrate.js)
  agendelle-quick     ~/agendelle (só build + restart, sem migrate)
  develoi-dashboard   /var/www/develoi-dashboard
  develoi-cardapio    /var/www/develoi-cardapio (com migrate.cjs)
  recrute-ia          /var/www/recrute-ia
  store-boxsys        /var/www/store-boxsys (git reset --hard!)
EOF
}

cmd_deploy() {
  local target="$1"
  case "$target" in
    mecaerp)
      ssh_vps "cd /var/www/mecaerp && git pull && npm run build && pm2 restart mecaerp"
      ;;
    psiflux)
      ssh_vps "cd /var/www/psiflux && git pull && npm install && npm run build && \
cd /var/www/psiflux/backend && npm install && node migrate.js && node patch_database.js && \
node patch_products_packages.js && pm2 restart psiflux --update-env"
      ;;
    agendelle)
      ssh_vps "cd ~/agendelle && git pull origin main && npm install && npx prisma generate && \
node migrate.js && npm run build && pm2 restart agendelle"
      ;;
    agendelle-quick)
      ssh_vps "cd ~/agendelle && git pull origin main && npm run build && pm2 restart agendelle"
      ;;
    develoi-dashboard)
      ssh_vps "cd /var/www/develoi-dashboard && git pull origin main && npm install && \
npx prisma db push && npm run build && pm2 restart develoi-api"
      ;;
    develoi-cardapio)
      ssh_vps "cd /var/www/develoi-cardapio && git pull origin main && npm install && \
npx prisma generate && node migrate.cjs && npm run build && pm2 restart develoi-cardapio"
      ;;
    recrute-ia)
      ssh_vps "cd /var/www/recrute-ia && git pull && npm install && node migrate.js && \
npm run build && pm2 restart recrute-ia --update-env"
      ;;
    store-boxsys)
      ssh_vps "cd /var/www/store-boxsys && git fetch origin main && git reset --hard origin/main && \
npm run build && pm2 restart store-boxsys"
      ;;
    list|"")
      list_targets
      ;;
    *)
      echo "Alvo de deploy desconhecido: $target" >&2
      list_targets
      exit 1
      ;;
  esac
}

usage() {
  cat <<EOF
Uso: bash deploy/vps.sh <comando> [args]

Comandos:
  shell                     Abre uma sessão SSH interativa na VPS
  logs <alvo> [linhas]      pm2 logs <alvo> --lines [linhas] (padrão 100)
  deploy <alvo>             Roda o deploy do <alvo> (deploy list para ver todos)
EOF
}

case "${1:-}" in
  shell)
    exec ssh -i "$VPS_KEY" "$VPS_HOST"
    ;;
  logs)
    target="${2:?informe o alvo, ex: psiflux, psiflux-bot, agendelle}"
    lines="${3:-100}"
    ssh_vps "pm2 logs $target --lines $lines"
    ;;
  deploy)
    cmd_deploy "${2:-}"
    ;;
  *)
    usage
    exit 1
    ;;
esac
