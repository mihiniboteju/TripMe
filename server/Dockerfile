# Development-optimized Dockerfile for Main Backend
# Dependencies installed at build time, code mounted as volume
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Expose port
EXPOSE 5000

# Start server (source code mounted via volume)
CMD ["node", "index.js"]
