# Dockerfile for server deployment
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/server ./apps/server
COPY apps/client ./apps/client

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "dist/apps/server/main.js"]

