FROM node:16-alpine AS base

WORKDIR /usr/app

# Install dependencies

COPY package.json yarn.lock ./
RUN yarn install

# Build
FROM base AS builder

COPY src ./src
COPY tsconfig.json .

RUN yarn build

CMD ["yarn", "start"]
