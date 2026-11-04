# syntax=docker/dockerfile:1
# Build context is apps/ (so the shared nginx config can be copied in):
#   docker buildx build -f hirehub/web/Dockerfile apps/

# The build output is static files, so build natively on the build machine.
FROM --platform=$BUILDPLATFORM node:26.13.0-alpine3.24 AS build
WORKDIR /src
COPY hirehub/web/package.json hirehub/web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY hirehub/web/ ./
RUN npm run build

# Unprivileged nginx: runs as uid 101 and listens on 8080.
FROM nginx/nginx-unprivileged:1.30.6-alpine3.24
ENV API_UPSTREAM=http://hirehub-api:8080 \
    CLIENT_MAX_BODY_SIZE=6m
COPY shared/web-kit/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=0755 shared/web-kit/15-resolver.sh /docker-entrypoint.d/15-resolver.sh
COPY --from=build /src/dist /usr/share/nginx/html
USER 101:101
EXPOSE 8080
