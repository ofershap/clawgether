FROM node:22-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY server.ts ./
COPY src/server ./src/server
COPY src/lib/types.ts ./src/lib/types.ts
COPY tsconfig.json next.config.ts ./

ENV NODE_ENV=production
ENV PORT=3847
EXPOSE 3847

CMD ["node", "--import", "tsx", "server.ts"]
