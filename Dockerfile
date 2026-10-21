# Imagens do Riscote: `server` (partidas) e `client` (página estática).
# Multi-arquitetura (linux/amd64 e linux/arm64, para o Orange Pi); ver docs/docker.md.

ARG NODE_IMAGE=node:24.11-alpine
ARG PNPM_VERSION=12.4.2

# Manifestos do workspace: o lockfile só confere com todos os pacotes presentes.
FROM ${NODE_IMAGE} AS workspace
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

# Servidor: o Node roda o TypeScript direto (remoção de tipos), sem build.
# As dependências de workspace ficam como links do pnpm: o Node não remove tipos
# de arquivos dentro de node_modules, então `pnpm deploy` (que copia) não serve.
FROM workspace AS server-deps
RUN pnpm install --frozen-lockfile --prod --filter @riscote/server...

FROM ${NODE_IMAGE} AS server
ENV NODE_ENV=production
WORKDIR /app
COPY --from=server-deps /app ./
COPY packages/shared/src packages/shared/src
COPY apps/server/src apps/server/src
USER node
EXPOSE 2567
CMD ["node", "apps/server/src/index.ts"]

# Cliente: compilado na arquitetura de quem constrói (o resultado é só HTML e JS).
FROM --platform=$BUILDPLATFORM workspace AS client-build
RUN pnpm install --frozen-lockfile --filter @riscote/client...
COPY packages/shared packages/shared
COPY apps/client apps/client
RUN pnpm --filter @riscote/client build

FROM nginx:1.29-alpine AS client
COPY --from=client-build /app/apps/client/dist /usr/share/nginx/html
EXPOSE 80
