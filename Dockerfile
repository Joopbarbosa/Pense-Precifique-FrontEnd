# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Produção com Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# OP #429 — Semgrep (missing-user): sem USER o processo roda como root no container.
# nginx:alpine já cria o usuário/grupo "nginx" (usado pelos workers por padrão) — só
# falta o master process (PID 1 do container) também não rodar como root. Ajusta
# ownership dos diretórios que o nginx precisa escrever em runtime (cache/pid/log) e
# troca a porta pra 8080 (não-root não binda porta <1024, ver nginx.conf).
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
