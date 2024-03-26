FROM node:21-alpine as console
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/vite.config.mjs frontend/tsconfig.json ./
COPY frontend/console console
RUN yarn build-console

FROM node:21-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY src src
COPY --from=console /app/dist_console public
CMD node src/main.mjs
