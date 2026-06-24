# ───── Build stage ─────
FROM node:20-book-slim AS builder
WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ───── Runtime: nginx serving the SPA ─────
# nginx.conf is copied into the client context by docker-compose (extra build context)
# or via the nginx.default.conf included here as a fallback.
FROM nginx:1.27-alpine AS runtime

# Default config (SPA fallback + /api proxy) bundled in the image.
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  client_max_body_size 25M;' \
  '  gzip on; gzip_types text/css application/javascript application/json image/svg+xml;' \
  '  location /api/ { proxy_pass http://server:5000; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }' \
  '  location ~* \\.(?:js|css|woff2?|png|jpg|jpeg|gif|webp|svg|ico)$ { expires 30d; add_header Cache-Control "public, immutable"; }' \
  '  location / { try_files $uri $uri/ /index.html; }' \
  '}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
