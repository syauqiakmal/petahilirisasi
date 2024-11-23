# Use an appropriate base image
FROM node:18.20.4-alpine

# Set the environment variable for the Node.js version
ENV NODE_VERSION=18.20.4

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the entire application code to the working directory
COPY . .

# Build the application
RUN npm run build

# Install 'serve' globally to serve the built application
RUN npm install -g serve

# Expose port 3000 for the application
EXPOSE 3000

# Define the command to run the application with correct port and SPA handling
CMD ["serve", "-s", "build", "-l", "3000"]
