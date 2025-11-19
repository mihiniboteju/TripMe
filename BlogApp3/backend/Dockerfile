# Development-optimized Dockerfile for BlogApp3 backend
# Code is mounted as volume from BlogApp3 root, dependencies installed at startup
FROM node:18-alpine

WORKDIR /app

# Expose port
EXPOSE 5002

# Install dependencies and start the backend server at runtime
CMD npm install && node backend/server.js