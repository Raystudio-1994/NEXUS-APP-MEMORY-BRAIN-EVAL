FROM oven/bun:1.2-alpine
WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install production dependencies
RUN bun install --production

# Copy remaining application code
COPY . .

# Build client-side assets
RUN bun run build

EXPOSE 3000

ENV NODE_ENV=production PORT=3000

CMD ["bun", "--bun", "run", "tsx", "server.ts"]
