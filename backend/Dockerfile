# Backend image: API + worker in one process (see src/all.ts). ffmpeg/ffprobe
# are required for upload duration checks.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
# Royalty-free sample for mock mode: a generated 45 s chord, so no third-party audio ships.
RUN mkdir -p /app/assets && ffmpeg -loglevel error \
  -f lavfi -i "sine=frequency=220:duration=45" \
  -f lavfi -i "sine=frequency=277.18:duration=45" \
  -f lavfi -i "sine=frequency=329.63:duration=45" \
  -filter_complex "amix=inputs=3,afade=t=in:d=2,afade=t=out:st=42:d=3,volume=0.6" \
  -ac 2 -b:a 128k /app/assets/mock-sample.mp3
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY drizzle ./drizzle
ENV MOCK_AUDIO_SOURCE_PATH=/app/assets/mock-sample.mp3 \
    STORAGE_DIR=/app/storage
EXPOSE 4100
CMD ["npm", "run", "start:all"]
