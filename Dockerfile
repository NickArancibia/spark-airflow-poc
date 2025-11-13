# Multi-stage build for Node.js services
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Default command (will be overridden in docker-compose)
CMD ["node", "server/server.js"]
