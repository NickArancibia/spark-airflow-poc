#!/bin/bash

# Script para iniciar el sistema completo con Docker

echo "🚀 Iniciando Sistema de Transacciones BTC..."
echo ""

# Levantar todo el sistema
echo "📦 Levantando contenedores..."
docker compose up -d

echo ""
echo "⏳ Esperando a que los servicios estén listos..."
echo "   (Esto puede tomar unos segundos...)"

# Esperar a que el API server responda
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo ""
        echo "✅ ¡Sistema iniciado correctamente!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT+1))
    echo -n "."
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo ""
    echo "⚠️  El sistema tardó más de lo esperado. Verifica los logs:"
    echo "   docker compose logs"
    exit 1
fi

echo ""
echo "📊 Estado de los servicios:"
docker compose ps
echo ""
echo "El sistema ya está funcionando. Puedes iniciar la interfaz con npm run cli"
echo ""
echo "Para detener el sistema corre npm run down"