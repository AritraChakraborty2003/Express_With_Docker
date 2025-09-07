# Use Debian-based Node.js
FROM node:18

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy only dependency files first (better cache)
COPY package.json pnpm-lock.yaml ./

# Install dependencies inside the container
RUN pnpm install --include=optional

# Copy rest of the app, but exclude node_modules
COPY . .

# Expose port
EXPOSE 4000

# Run app
CMD ["pnpm", "start"]
