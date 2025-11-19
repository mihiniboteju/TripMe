# Development-optimized Dockerfile for React app
# Dependencies installed at build time, code mounted as volume
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Expose port
EXPOSE 3000

# Start development server (source code mounted via volume)
CMD ["npm", "start"]
