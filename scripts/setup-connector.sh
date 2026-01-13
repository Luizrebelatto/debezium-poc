#!/bin/bash

# Script para configurar o conector Debezium

set -e

echo "⏳ Aguardando Debezium Connect ficar disponível..."

until curl -s http://localhost:8083/connectors > /dev/null 2>&1; do
    sleep 2
    echo "   Ainda aguardando..."
done

echo "✅ Debezium Connect está pronto!"

echo ""
echo "📤 Registrando conector PostgreSQL..."

curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @connector-config.json

echo ""
echo ""
echo "✅ Conector registrado com sucesso!"
echo ""
echo "📊 Status dos conectores:"
curl -s http://localhost:8083/connectors | jq .

echo ""
echo "📡 Para verificar o status detalhado:"
echo "   curl http://localhost:8083/connectors/postgres-connector/status | jq ."
