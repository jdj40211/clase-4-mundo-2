#!/bin/bash
# Simula un comentario de Instagram con firma HMAC válida
SECRET="${1:-dummy_secret}"
TEXTO="${2:-quiero la CLASE gratis}"
URL="${3:-http://localhost:3000/webhook}"

PAYLOAD=$(cat <<EOF
{"object":"instagram","entry":[{"id":"123456","time":1700000000,"changes":[{"field":"comments","value":{"id":"comment_demo_1","text":"$TEXTO","from":{"id":"user_demo_99","username":"alumno_demo"},"media":{"id":"media_1"}}}]}]}
EOF
)

SIG="sha256=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')"

echo "→ Enviando comentario: \"$TEXTO\""
curl -s -X POST "$URL" -H "Content-Type: application/json" -H "X-Hub-Signature-256: $SIG" -d "$PAYLOAD"
echo
