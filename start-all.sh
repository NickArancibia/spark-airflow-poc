#!/bin/bash

# Script para iniciar todos los servicios en tmux

echo "🚀 Iniciando todos los servicios..."

# Verificar si tmux está instalado
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux no está instalado. Por favor instálalo primero:"
    echo "   brew install tmux"
    exit 1
fi

# Crear sesión de tmux
SESSION="kafka-services"

# Verificar si la sesión ya existe y eliminarla
tmux has-session -t $SESSION 2>/dev/null
if [ $? == 0 ]; then
    echo "⚠️  Sesión existente encontrada, eliminando..."
    tmux kill-session -t $SESSION
fi

# Crear nueva sesión
echo "📦 Creando sesión tmux: $SESSION"
tmux new-session -d -s $SESSION -n validator

# Panel 1: Validator
tmux send-keys -t $SESSION:validator "cd $(pwd) && npm run validator" C-m

# Panel 2: Liquidity
tmux split-window -h -t $SESSION:validator
tmux send-keys -t $SESSION:validator "cd $(pwd) && npm run liquidity" C-m

# Panel 3: Payment
tmux split-window -v -t $SESSION:validator.0
tmux send-keys -t $SESSION:validator "cd $(pwd) && npm run payment" C-m

# Panel 4: API Server
tmux split-window -v -t $SESSION:validator.1
tmux send-keys -t $SESSION:validator "cd $(pwd) && npm run api" C-m

# Ajustar layout
tmux select-layout -t $SESSION:validator tiled

echo ""
echo "✅ Todos los servicios iniciados en tmux!"
echo ""
echo "📋 Comandos útiles:"
echo "   tmux attach -t $SESSION    # Conectarse a la sesión"
echo "   tmux kill-session -t $SESSION    # Terminar todos los servicios"
echo ""
echo "🔑 Atajos dentro de tmux:"
echo "   Ctrl+B → flechas    # Navegar entre paneles"
echo "   Ctrl+B → D          # Desconectarse (sin cerrar)"
echo "   Ctrl+C              # Detener servicio en panel actual"
echo ""

# Conectar automáticamente
tmux attach -t $SESSION

