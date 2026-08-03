#!/bin/bash
# Gestiona el entorno local del workshop
# Uso: bash scripts/dev.sh [iniciar|apagar|logs|reiniciar|borrar]

# Siempre ejecutar desde la raíz del proyecto
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

ACTION=${1:-iniciar}
COMPOSE_FILE="docker-compose.dev.yml"

mostrar_info() {
  local MAX_WAIT=60
  local ELAPSED=0
  WORKSHOP_CODE=""
  ADMIN_CODE=""

  while [ -z "$WORKSHOP_CODE" ] && [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    WORKSHOP_CODE=$(docker compose -f $COMPOSE_FILE logs backend 2>&1 | sed -n 's/.*Código de acceso: \(.*\)/\1/p' | tail -1)
  done
  ADMIN_CODE=$(docker compose -f $COMPOSE_FILE logs backend 2>&1 | sed -n 's/.*Código admin: \(.*\)/\1/p' | tail -1)

  if [ -z "$WORKSHOP_CODE" ]; then
    echo ""
    echo "⚠️  No se pudo obtener los códigos después de ${MAX_WAIT}s."
    echo "   Revisa los logs con: bash scripts/dev.sh logs"
    echo ""
    return 1
  fi

  echo ""
  echo "══════════════════════════════════════════════════"
  echo "  ✅ Workshop listo"
  echo "══════════════════════════════════════════════════"
  echo ""
  echo "  🎮 Workshop (estudiantes): http://127.0.0.1"
  echo "  🖥️  Floci UI (consola AWS):  http://127.0.0.1:4500"
  echo "  📊 Admin (scoreboard):      http://127.0.0.1/admin?code=$ADMIN_CODE"
  echo ""
  echo "  🔑 Código de acceso: $WORKSHOP_CODE"
  echo "  👑 Código admin:     $ADMIN_CODE"
  echo ""
  echo "══════════════════════════════════════════════════"
}

case $ACTION in
  iniciar)
    echo "🚀 Levantando entorno local..."
    docker compose -f $COMPOSE_FILE up -d --build
    echo ""
    echo "⏳ Esperando a que el backend arranque..."
    mostrar_info
    ;;
  apagar)
    echo "🛑 Apagando entorno..."
    docker compose -f $COMPOSE_FILE down -v
    echo "✅ Todo apagado."
    ;;
  logs)
    docker compose -f $COMPOSE_FILE logs -f
    ;;
  reiniciar)
    echo "🔄 Reconstruyendo desde cero..."
    docker compose -f $COMPOSE_FILE down -v
    docker compose -f $COMPOSE_FILE up -d --build
    echo ""
    echo "⏳ Esperando a que el backend arranque..."
    mostrar_info
    ;;
  borrar)
    echo "💣 Eliminando TODO lo creado por el workshop..."
    echo ""
    # Matar contenedores Floci de usuarios (si el backend los creó)
    FLOCI_CONTAINERS=$(docker ps -a --filter "name=floci-user-" --format "{{.ID}}" 2>/dev/null)
    if [ -n "$FLOCI_CONTAINERS" ]; then
      echo "🗑️  Eliminando contenedores Floci de usuarios..."
      echo "$FLOCI_CONTAINERS" | xargs docker rm -f
    fi
    # Bajar servicios y borrar volúmenes e imágenes locales
    echo "🛑 Deteniendo servicios..."
    docker compose -f $COMPOSE_FILE down -v --rmi local
    # Limpiar red huérfana
    docker network rm workshop-internal 2>/dev/null || true
    # Limpiar imágenes sin usar
    echo "🧹 Limpiando imágenes..."
    docker image prune -f > /dev/null 2>&1
    echo ""
    echo "✅ Todo eliminado. Para volver a empezar: bash scripts/dev.sh iniciar"
    ;;
  *)
    echo "Uso: bash scripts/dev.sh [iniciar|apagar|logs|reiniciar|borrar]"
    echo ""
    echo "  iniciar   - Levanta todo (construye si es necesario)"
    echo "  apagar    - Apaga los contenedores"
    echo "  logs      - Ver logs en tiempo real"
    echo "  reiniciar - Apaga, borra datos y reconstruye desde cero"
    echo "  borrar    - Elimina TODO: contenedores, imágenes, volúmenes, redes"
    ;;
esac
