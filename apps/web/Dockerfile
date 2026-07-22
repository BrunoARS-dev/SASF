FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

RUN npm ci

COPY tsconfig.base.json ./
COPY apps/web ./apps/web

RUN npm run --workspace=@sasf/web build

EXPOSE 3000

CMD ["npm", "run", "--workspace=@sasf/web", "start"]