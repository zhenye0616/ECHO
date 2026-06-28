FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.cli.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build:cli
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV ECHO_CEO_CONTEXT_REPO_PATH=/app
ENV ECHO_SLACK_RESPONDER_INTAKE_ONLY=true
ENV ECHO_LINEAR_INTAKE_ENABLED=true
ENV ECHO_LINEAR_INTAKE_DRAFT_STORE=/data/linear-intake-drafts.json
ENV ECHO_CEO_EVENT_LOG_PATH=/data/slack-responder-events.md

RUN mkdir -p /data && chown -R node:node /data /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

CMD ["node", "dist/surfaces/ceo-slack-responder/index.js"]
