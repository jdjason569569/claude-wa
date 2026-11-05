#!/usr/bin/env bash
# open-wa: WhatsApp como API en tu PC (usa el Google Chrome instalado)
# Uso:
#   ./start.sh              -> puerto 8080
#   PORT=8081 ./start.sh    -> otro puerto
# API:    http://localhost:$PORT/api-docs/
# Panel:  http://localhost:$PORT/dashboard/  (aquí sale el QR si hay que vincular)
#
# La sesión se guarda en session.data.json: no la compartas, da acceso a tu WhatsApp.
# Versión fijada: la 4.x y la 5.4.0 ya no funcionan con el WhatsApp Web actual.

cd "$(dirname "$0")"
exec npx --yes @open-wa/wa-automate@5.10.0 \
  --use-chrome \
  --popup \
  --qr-timeout 0 \
  --port "${PORT:-8080}"
