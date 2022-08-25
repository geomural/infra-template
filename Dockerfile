FROM node:16-alpine
WORKDIR /app

COPY . .
RUN npm ci --production
RUN npm run build

RUN npm install -g serve

CMD ["serve", "-s", "build", "-l", "3000"]