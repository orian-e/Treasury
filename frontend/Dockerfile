FROM node:22

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node public ./public
COPY --chown=node:node src ./src
COPY --chown=node:node tsconfig.json ./

EXPOSE 3000

ENV CI=false
ENV SKIP_PREFLIGHT_CHECK=true

CMD ["npm", "start"]
