FROM node:22-alpine AS build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG SITE_URL=https://iettquiz.duckdns.org
# Empty API URL selects the account-free, browser-persisted game.
ARG API_BASE_URL=
ARG AUTH_MODE=supabase
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ENV VITE_SITE_URL=$SITE_URL VITE_API_BASE_URL=$API_BASE_URL VITE_AUTH_MODE=$AUTH_MODE VITE_SUPABASE_URL=$SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
RUN npm run build

FROM nginx:stable-alpine
COPY deploy/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
