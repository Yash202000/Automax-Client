# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Bake placeholder so docker-entrypoint.sh can sed-replace it at runtime
ARG VITE_BASE_PATH=/BASEPATHPLACEHOLDER/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy serve config (cache headers: no-cache for index.html, immutable for hashed assets)
COPY serve.json /app/serve.json

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use entrypoint script to generate runtime config
ENTRYPOINT ["/app/docker-entrypoint.sh"]
