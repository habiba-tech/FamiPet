# =========================================================
# FAMIPET - FINAL REACT FRONTEND DOCKERFILE
# (docker-final: production Dockerization - frontend + backend)
#
# Multi-stage production image for the migrated React app:
#   1. node:26-alpine   - install locked dependencies, run the
#                         tsc + vite build. The API base is a build
#                         arg (relative "/api" = same-origin through
#                         the nginx reverse proxy), so nothing in the
#                         bundle hardcodes a backend host.
#   2. nginx:alpine     - serves the built SPA on port 5502 (the
#                         canonical frontend port from the FamiPet
#                         CLIENT_URL default), with SPA fallback and
#                         caching. No runtime Node process.
#
# Build context = ../frontend-react (this module's repository root).
# =========================================================

FROM node:26-alpine AS build
WORKDIR /app

# API base baked at build time. "/api" is relative and resolves against
# whichever origin serves the app (nginx reverse proxy). Override with
# --build-arg VITE_API_URL for a future split-origin deployment.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# 1) Dependency manifests first so this layer stays cached unless they change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 2) Source code + config. frontend-react/.dockerignore keeps node_modules,
#    dist and .env out of the build context (and out of this layer).
COPY . .

# 3) Production build (tsc -b && vite build).
RUN npm run build

# ---------------- Runtime image ----------------
FROM nginx:alpine

# SPA server configuration (listens on 5502, index.html fallback).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built SPA (dist) only.
COPY --from=build /app/dist /usr/share/nginx/html

# Frontend container port (matches the FamiPet CLIENT_URL default of 5502).
# Host publishing happens at Docker Compose time, not here.
EXPOSE 5502

# Health check against the SPA server (BusyBox wget ships with nginx:alpine).
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:5502/ || exit 1

# nginx:alpine runs its master process as root and then drops worker
# permissions internally; CMD is inherited from the nginx base image.
# (Same posture as the existing legacy-frontend image and the Phase-28
# frontend image - the non-privileged worker drop is nginx's built-in.)