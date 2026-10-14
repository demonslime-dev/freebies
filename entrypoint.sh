#!/bin/bash
set -e

# =============================================================================
# CONFIGURATION
# =============================================================================
SCREEN_WIDTH=${SCREEN_WIDTH:-1920}
SCREEN_HEIGHT=${SCREEN_HEIGHT:-1080}
SCREEN_DEPTH=${SCREEN_DEPTH:-24}
DISPLAY_NUM=${DISPLAY_NUM:-99}
VNC_PORT=${VNC_PORT:-5900}
NOVNC_PORT=${NOVNC_PORT:-6080}

# Auto-detect noVNC installation path
if [ -f /usr/share/novnc/vnc.html ]; then
    NOVNC_ROOT=/usr/share/novnc
elif [ -f /usr/share/novnc/utils/vnc.html ]; then
    NOVNC_ROOT=/usr/share/novnc/utils
else
    echo "ERROR: noVNC not found in expected locations"
    exit 1
fi

echo "=========================================="
echo "  Playwright + noVNC"
echo "  Ubuntu 26.04 LTS (Resolute Raccoon)"
echo "=========================================="
echo ""

# =============================================================================
# 1. START VIRTUAL DISPLAY (Xvfb)
# =============================================================================
echo "[1/4] Starting Xvfb on display :${DISPLAY_NUM}..."
Xvfb :${DISPLAY_NUM} -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} \
    -ac \
    +extension GLX \
    +render \
    -noreset &
XVFB_PID=$!

export DISPLAY=:${DISPLAY_NUM}
sleep 2

if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "ERROR: Xvfb failed to start!"
    exit 1
fi
echo "      ✓ Xvfb running (PID: $XVFB_PID, ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH})"

# =============================================================================
# 2. START WINDOW MANAGER (Fluxbox)
# =============================================================================
echo "[2/4] Starting Fluxbox window manager..."
fluxbox &
FLUXBOX_PID=$!
sleep 1
echo "      ✓ Fluxbox running (PID: $FLUXBOX_PID)"

# =============================================================================
# 3. START VNC SERVER (x11vnc)
# =============================================================================
echo "[3/4] Starting x11vnc on port ${VNC_PORT}..."
x11vnc \
    -display :${DISPLAY_NUM} \
    -forever \
    -nopw \
    -rfbport ${VNC_PORT} \
    -shared \
    -noxkb \
    -noxfixes \
    -noxrecord \
    -xkb \
    -noxdamage \
    -xrandr &
X11VNC_PID=$!
sleep 1
echo "      ✓ x11vnc running (PID: $X11VNC_PID, no password)"

# =============================================================================
# 4. START WEBSOCKET BRIDGE + noVNC
# =============================================================================
echo "[4/4] Starting noVNC on port ${NOVNC_PORT}..."
websockify \
    --web ${NOVNC_ROOT} \
    --cert none \
    ${NOVNC_PORT} \
    localhost:${VNC_PORT} &
WEBSOCKIFY_PID=$!
sleep 1
echo "      ✓ websockify + noVNC running (PID: $WEBSOCKIFY_PID)"

echo ""
echo "=========================================="
echo "  🚀 CONTAINER READY"
echo "=========================================="
echo "  🌐 noVNC Web UI:  http://localhost:${NOVNC_PORT}/vnc.html"
echo "  🔌 Direct VNC:   vnc://localhost:${VNC_PORT} (no password)"
echo "  🖥️  Display:       :${DISPLAY_NUM}"
echo ""
echo "  To run tests:"
echo "    docker exec -it <container> pnpm exec playwright test --headed"
echo "=========================================="
echo ""

# =============================================================================
# KEEP ALIVE OR EXECUTE COMMAND
# =============================================================================
if [ $# -eq 0 ] || [ "$1" = "tail" ]; then
    echo "Container is running. Press Ctrl+C to stop."
    wait
else
    echo "Executing: $@"
    exec pnpm run "$@"
fi