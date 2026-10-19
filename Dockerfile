FROM node:24.13.0-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && chown -R node:node /app

FROM dependencies AS test
COPY index.html vite.config.js .nvmrc .env.example ./
COPY src ./src
USER node
CMD ["npm", "test"]

FROM test AS build
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28.0-alpine AS web
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
