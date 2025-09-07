# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app


#Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and package-lock.json (if available)
COPY package*.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 4000

# Define the command to run the application
CMD ["pnpm", "start"]
