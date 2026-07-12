# InfluenceX Mini App (Telegram Mini App, React/Vite SPA) - production Docker image.
# Build context MUST be the monorepo ROOT: `docker build -f apps/mini-app/Dockerfile .`
# Railway'da: Root Directory = repo ildizi, Dockerfile Path = apps/mini-app/Dockerfile.

# ---- 1-bosqich: build ----
FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/mini-app/package.json apps/mini-app/package.json

RUN npm install

COPY packages/shared packages/shared
COPY apps/mini-app apps/mini-app

RUN npm run build --workspace=packages/shared

# VITE_API_BASE_URL build vaqtida statik JS ichiga "yopishtiriladi" (Vite'ning
# import.meta.env mexanizmi) - shuning uchun Railway'da bu build-arg sifatida
# berilishi kerak (masalan: https://influencex-api.up.railway.app/api/v1).
ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build --workspace=apps/mini-app

# ---- 2-bosqich: statik fayllarni nginx orqali xizmat qilish ----
FROM nginx:1.27-alpine AS runner
COPY apps/mini-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/mini-app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
