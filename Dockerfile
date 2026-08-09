# =============================================================================
# Playwright + noVNC on Ubuntu 26.04 LTS (Resolute Raccoon)
# =============================================================================
# FROM mcr.microsoft.com/playwright:v1.62.0-resolute
FROM denoland/deno:ubuntu-2.9.5

# Prevent interactive apt prompts
ENV DEBIAN_FRONTEND=noninteractive

# =============================================================================
# 1. INSTALL GUI STACK
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Virtual framebuffer (fake display)
    xvfb \
    # Lightweight window manager
    fluxbox \
    # VNC server for the virtual display
    x11vnc \
    # WebSocket-to-TCP bridge
    websockify \
    # Browser-based VNC client
    novnc \
    # Process control utilities
    supervisor \
    net-tools \
    curl \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# =============================================================================
# 2. CONFIGURE noVNC
# =============================================================================
# The novnc package installs to /usr/share/novnc on Ubuntu 26.04
# Create an index.html symlink for cleaner URLs
RUN if [ -f /usr/share/novnc/vnc.html ]; then \
      ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html; \
    fi

# =============================================================================
# 3. SET DISPLAY ENVIRONMENT
# =============================================================================
ENV DISPLAY=:99
ENV SCREEN_WIDTH=1920
ENV SCREEN_HEIGHT=1080
ENV SCREEN_DEPTH=24

# =============================================================================
# 4. APPLICATION SETUP
# =============================================================================
WORKDIR /app

# Copy package files first for optimal Docker layer caching
# Copy all deno.json / deno.lock recursively, preserving their directory
# structure (apps/*, packages/*, root). --parents is required: plain COPY
# globs use Go filepath.Match, where `**` is NOT recursive.
COPY --parents **/deno.json **/deno.lock ./
RUN deno install
RUN deno run -A patchright install chrome --with-deps

# Copy project source
COPY . .

# =============================================================================
# 5. STARTUP SCRIPT
# =============================================================================
COPY start.sh /start.sh
RUN chmod +x /start.sh

# =============================================================================
# 6. EXPOSE PORTS
# =============================================================================
# 6080 = noVNC web interface (access via browser)
# 5900 = Direct VNC connection (optional, for native VNC clients)
EXPOSE 6080 5900

# =============================================================================
# 7. ENTRYPOINT
# =============================================================================
ENTRYPOINT ["/start.sh"]
CMD ["tail", "-f", "/dev/null"]