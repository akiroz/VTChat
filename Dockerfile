FROM node:24.14.1-alpine3.22 AS console
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/vite.config.mjs frontend/tsconfig.json ./
COPY frontend/console console
RUN yarn build-console

FROM node:24.14.1-alpine3.22
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY src src
COPY --from=console /app/dist_console public
CMD ["node", "src/main.mjs"]
