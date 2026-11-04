# syntax=docker/dockerfile:1
# Build context is apps/ (so the shared kit can be copied in):
#   docker buildx build -f northbank/api/Dockerfile apps/

# Dependencies are pure JavaScript, so install them natively on the build
# machine (fast, no CPU emulation) and copy them into the target image.
FROM --platform=$BUILDPLATFORM node:26.13.0-alpine3.24 AS deps
WORKDIR /app
COPY northbank/api/package.json northbank/api/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:26.13.0-alpine3.24
ENV NODE_ENV=production \
    PORT=8080 \
    APP_NAME=northbank-api
WORKDIR /app
# AWS RDS CA bundle, so the TLS connection to RDS is fully verified.
ADD --chmod=0644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /app/certs/rds-global-bundle.pem
COPY --from=deps /app/node_modules ./node_modules
COPY northbank/api/package.json ./
COPY shared/api-kit/ ./kit/
COPY northbank/api/src/ ./src/
COPY northbank/api/db/ ./db/
# "node" (uid 1000) ships with the official image.
USER 1000:1000
EXPOSE 8080
CMD ["node", "src/index.js"]
