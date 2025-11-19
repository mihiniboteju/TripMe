# Development-optimized Dockerfile for React app
# Code is mounted as volume, dependencies installed at startup
FROM node:18-alpine

WORKDIR /app

# Expose port
EXPOSE 3000

# Install dependencies and start development server at runtime
CMD npm install --legacy-peer-deps && npm start
