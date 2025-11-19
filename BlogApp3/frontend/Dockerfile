# Development-optimized Dockerfile for BlogApp3 frontend
# Code is mounted as volume, dependencies installed at startup
# Using Node 20 for React 19 compatibility
FROM node:20-alpine

WORKDIR /app

# Expose port
EXPOSE 5173

# Install dependencies and start Vite dev server at runtime
CMD npm install && npm run dev -- --host