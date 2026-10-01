# ─────────────────────────────────────────────────────────────────────────────
# EventTracker — production image
#
#   docker build -t eventtracker .
#   docker run -p 5000:5000 \
#     -e JWT_SECRET="$(openssl rand -hex 48)" \
#     -e TICKET_SECRET="$(openssl rand -hex 32)" \
#     -e PUBLIC_APP_URL=https://events.example.com \
#     -v eventtracker-data:/data \
#     eventtracker
#
# One container serves the API, the sockets and the built client. /data holds
# the SQLite database and uploaded media, so mount a volume there.
# ─────────────────────────────────────────────────────────────────────────────

# ---- build the client -------------------------------------------------------
FROM node:22-alpine AS client

WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
RUN npm ci --workspace client --include-workspace-root

COPY client client
RUN npm run build --workspace client

# ---- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=5000 \
    DATA_DIR=/data \
    UPLOADS_DIR=/data/uploads

WORKDIR /app

# Production dependencies only: no build tools, no dev server.
# client/package.json is needed because the root manifest declares a workspace.
COPY package.json package-lock.json ./
COPY client/package.json client/
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY server server
COPY scripts scripts
COPY --from=client /app/client/dist client/dist

# Run as the unprivileged user that ships with the image.
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node

VOLUME ["/data"]
EXPOSE 5000

# The health endpoint also verifies the database is reachable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||5000) +'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
