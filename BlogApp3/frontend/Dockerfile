# Development-optimized Dockerfile for BlogApp3 frontend
# Dependencies installed at build time, code mounted as volume
# Using Node 20 for React 19 compatibility
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Expose port
EXPOSE 5173

# Start Vite dev server (source code mounted via volume)
CMD ["npm", "run", "dev", "--", "--host"]