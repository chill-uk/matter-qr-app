FROM node:24-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY scripts/ ./scripts/
COPY web/ ./web/
RUN npm run build:vendor

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/ /usr/share/nginx/html/
EXPOSE 80
