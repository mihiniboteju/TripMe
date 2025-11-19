# Development-optimized Dockerfile for BlogApp3 backend
# Dependencies installed at build time, code mounted as volume from BlogApp3 root
FROM node:18-alpine

WORKDIR /app

# Copy package files from BlogApp3 root and install dependencies
COPY package*.json ./
RUN npm install

# Expose port
EXPOSE 5002

# Start the backend server (source code mounted via volume)
CMD ["node", "backend/server.js"]