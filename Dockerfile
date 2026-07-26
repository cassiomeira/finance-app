# ─── Stage 1: Build Frontend ────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Instalar TODAS as dependências (incluindo devDependencies como vite, typescript)
COPY package.json package-lock.json* ./
ENV NODE_ENV=development
RUN npm install --legacy-peer-deps

# Copiar código fonte e buildar
COPY src/ ./src/
COPY public/ ./public/
COPY index.html vite.config.ts tsconfig*.json tailwind.config.ts postcss.config.js components.json ./

# Build arg para a URL da API (será /api por causa do nginx proxy)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

ARG VITE_GEMINI_API_KEY=""
ENV VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}

RUN npx vite build

# ─── Stage 2: Production ────────────────────────────────────────────────────
FROM node:20-alpine

# Instalar nginx e supervisor
RUN apk add --no-cache nginx supervisor

WORKDIR /app

# ─── Backend ─────────────────────────────────────────────────────────────────
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

COPY backend/ ./backend/

# Criar diretório de uploads
RUN mkdir -p /app/backend/uploads

# ─── Frontend (do build) ────────────────────────────────────────────────────
COPY --from=frontend-build /app/dist /app/frontend/dist

# ─── Nginx Config ────────────────────────────────────────────────────────────
COPY <<'NGINX_CONF' /etc/nginx/http.d/default.conf
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;

    server_name _;

    # Frontend React (arquivos estáticos do build)
    root /app/frontend/dist;
    index index.html;

    # SPA - redireciona todas as rotas para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para o backend Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
    }

    # Servir uploads
    location /uploads/ {
        alias /app/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
NGINX_CONF

# ─── Supervisord Config (roda nginx + backend juntos) ────────────────────────
COPY <<'SUPERVISOR_CONF' /etc/supervisord.conf
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0
loglevel=info

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:backend]
command=node /app/backend/src/server.js
directory=/app/backend
environment=PORT="3001"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
SUPERVISOR_CONF

# Expõe porta 8080 (nginx)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3001/health || exit 1

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
