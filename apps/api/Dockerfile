FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

RUN npm ci

COPY tsconfig.base.json ./
COPY apps/api ./apps/api

RUN npm run --workspace=@sasf/api prisma -- generate
RUN npm run --workspace=@sasf/api build

EXPOSE 3001

CMD ["npm", "run", "--workspace=@sasf/api", "start"]