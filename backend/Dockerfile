FROM node:22

WORKDIR /app

RUN mkdir -p /app/node_modules && chown -R node:node /app

EXPOSE 5000

USER node

CMD npm install; npm start
