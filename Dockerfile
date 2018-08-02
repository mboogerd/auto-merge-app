#####################
#    Build image    #
#####################

FROM node:8.9.4 as build

WORKDIR /app

# Install dependencies as early as possible to make use of docker's caching.
COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
RUN npm install

# Copy sources last. This way, source-only changes will be rebuilt quickly.
COPY .env .
COPY .auto-merge-bot.2018-08-02.private-key.pem .
COPY src src
COPY test test
RUN npm run build && npm run test

#####################
#    Final image    #
#####################
FROM node:8.9.4

ARG githash=nohash
ARG buildtime=notime
ENV GIT_HASH=$githash
ENV BUILD_TIME=$buildtime
ENV TAG=auto-merge-bot
ENV NODE_ENV=production

WORKDIR /home/node/app
COPY --from=build /app .

EXPOSE 3000
CMD npm start