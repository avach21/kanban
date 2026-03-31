FROM oven/bun:1

WORKDIR /app

COPY bun.lockb package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json

RUN bun install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/types ./packages/types

RUN chmod +x /app/apps/api/docker-entrypoint.sh

ENV API_PORT=3001

EXPOSE 3001

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
CMD ["bun", "run", "start"]
