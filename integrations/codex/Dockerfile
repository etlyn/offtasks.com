FROM node:24.21.0-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive
COPY src ./src
COPY scripts/build-widget.mjs ./scripts/build-widget.mjs
COPY tsconfig.json ./
RUN yarn build && yarn install --frozen-lockfile --production=true --non-interactive && yarn cache clean

FROM node:24.21.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production OFFTASK_BIND_HOST=0.0.0.0
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/public ./public
USER node
CMD ["node", "dist/start.js"]
