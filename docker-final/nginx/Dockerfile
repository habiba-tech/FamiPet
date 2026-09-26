# =========================================================
# FAMIPET - FINAL NGINX REVERSE-PROXY DOCKERFILE
# (docker-final: production Dockerization - frontend + backend)
#
# Dedicated nginx:alpine edge container that is the single
# published entry point of the final stack. Static content from
# the React frontend container, the API and uploads from the
# backend container - both by service name on the internal
# Docker networks. Same posture as the existing deployed proxy.
# =========================================================

FROM nginx:alpine

# Reverse-proxy + security-header configuration (live routing preserved).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Published entry point.
EXPOSE 80

# Health check against the proxy itself (static path -> frontend).
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

# nginx:alpine runs its master process as root and then drops worker
# permissions internally; no extra configuration needed.
# CMD is inherited from the nginx base image.