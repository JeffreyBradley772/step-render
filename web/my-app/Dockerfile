FROM node:22-alpine as deps

WORKDIR /app

COPY package.json ./

RUN npm install

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

# Accept build argument and set as environment variable
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 devgroup
RUN adduser --system --uid 1001 devuser

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=devuser:devgroup /app/.next/standalone ./
COPY --from=builder --chown=devuser:devgroup /app/.next/static ./.next/static

USER devuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]