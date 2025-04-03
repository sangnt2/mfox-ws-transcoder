ARG NODE_VERSION=22

FROM node:${NODE_VERSION} as base
WORKDIR /usr/src/app
EXPOSE 3000

RUN apt-get update && apt-get install -y ffmpeg 

FROM base AS dependencies
COPY package*.json ./
RUN npm install --save \
    ws \
    dotenv \
    ajv \
    jsonwebtoken \
    axios 

FROM base AS builder
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
CMD ["node", "index.js"]

FROM base as dev
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm install -g nodemon
CMD ["nodemon", "index.js"]