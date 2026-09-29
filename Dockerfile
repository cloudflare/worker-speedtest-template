# Build stage: bundle the Worker script and fetch the workerd runtime binary
FROM node:22-bookworm-slim AS build
WORKDIR /build
RUN npm install --no-save --no-package-lock esbuild@0.28.2 workerd@1.20260928.1 \
 && cp node_modules/@cloudflare/workerd-linux-*/bin/workerd /build/workerd
COPY index.js ./
COPY src ./src
RUN npx esbuild index.js --bundle --format=iife --outfile=dist/worker.js

# Runtime stage: workerd serving the bundled Worker
FROM debian:bookworm-slim
COPY --from=build /build/workerd /usr/local/bin/workerd
WORKDIR /app
COPY --from=build /build/dist/worker.js ./worker.js
COPY config.capnp ./
USER nobody
EXPOSE 8080
CMD ["workerd", "serve", "/app/config.capnp"]
