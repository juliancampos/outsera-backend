FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 CSV_PATH=/app/data/Movielist.csv
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/src ./dist/src
COPY docs/Movielist.csv ./data/Movielist.csv
USER node
EXPOSE 3000
CMD ["node", "--experimental-sqlite", "dist/src/server.js"]
