# Development-optimized Dockerfile for Main Backend
# Code is mounted as volume, dependencies installed at startup
FROM node:18-alpine

WORKDIR /app

# Expose port
EXPOSE 5000

# Install dependencies and start server at runtime
CMD npm install --legacy-peer-deps && node index.js
