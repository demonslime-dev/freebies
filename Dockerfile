FROM ubuntu:26.04

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
    ca-certificates \
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
# 4. INSTALL NODE.JS & PLAYWRIGHT BROWSER
# =============================================================================
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# Install Chromium + system deps using the project's own playwright version
RUN pnpm dlx patchright install --with-deps chrome

# =============================================================================
# 5. SET WORKING DIRECTORY AND COPY APP FILES
# =============================================================================
WORKDIR /app

# Copy package files first for optimal Docker layer caching.
# --parents is required: plain COPY globs use Go filepath.Match,
# where `**` is NOT recursive.
COPY --parents **/package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# =============================================================================
# 6. STARTUP SCRIPT
# =============================================================================
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# =============================================================================
# 7. EXPOSE PORTS
# =============================================================================
# 6080 = noVNC web interface (access via browser)
# 5900 = Direct VNC connection (optional, for native VNC clients)
EXPOSE 6080 5900

# =============================================================================
# 8. ENTRYPOINT
# =============================================================================
ENTRYPOINT ["/entrypoint.sh"]
CMD ["scraper:scrape"]