FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY index.js ./
COPY config ./config

# Folder session (will be mounted as volume)
RUN mkdir -p auth

# Set memory limit for Node.js
ENV NODE_OPTIONS="--max-old-space-size=256"

CMD ["node", "index.js"]
