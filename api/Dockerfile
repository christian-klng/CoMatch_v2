# CoMatch API (Hono + Node). Built and run by Coolify from this folder.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 3000
# Apply pending migrations before serving — keeps schema and code in lockstep
# on every deploy (migrate.js is forward-only and idempotent).
CMD ["sh", "-c", "node dist/migrate.js && node dist/index.js"]
