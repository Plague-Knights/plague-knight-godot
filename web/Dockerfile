FROM node:22-slim
WORKDIR /app
COPY serve.js package.json ./
COPY ../build/web ./build/web
EXPOSE 8080
CMD ["node", "serve.js"]
