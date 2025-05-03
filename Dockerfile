# syntax=docker/dockerfile:1

ARG NODE_VERSION=18.0.0

# Base image
FROM node:${NODE_VERSION}-alpine as base
WORKDIR /usr/src/app
EXPOSE 3000

# Development stage
FROM base as dev
COPY package*.json ./
RUN npm ci --include=dev
USER node
COPY . .
CMD ["npm", "run", "dev"]

# Production stage
FROM base as prod
COPY package*.json ./
RUN npm ci --omit=dev
USER node
COPY . .
CMD ["node", "src/index.js"]

FROM base as test
ENV NODE_ENV test
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --include=dev
USER node
COPY . .
RUN npm run test