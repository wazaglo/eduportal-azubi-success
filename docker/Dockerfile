FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache curl

FROM base AS development

RUN npm install -g esbuild

COPY package.json package-lock.json* ./
RUN npm install

COPY backend/package.json backend/package-lock.json* ./backend/
RUN npm install --prefix backend

COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN npm install --prefix frontend

COPY backend/ ./backend/
COPY frontend/ ./frontend/

EXPOSE 8081 3000

CMD ["npm", "run", "dev"]

FROM base AS build

RUN npm install -g esbuild

COPY package.json package-lock.json* ./
RUN npm install

COPY backend/package.json backend/package-lock.json* ./backend/
RUN npm install --prefix backend

COPY backend/ ./backend/
RUN npm run build --prefix backend

COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN npm install --prefix frontend

COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

FROM nginx:alpine AS production

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80