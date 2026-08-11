FROM node:22

WORKDIR /app
# /app itself must be writable by node: the logger creates logs/ at runtime.
RUN chown node:node /app
USER node

COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . .

EXPOSE 5000

# The deps are already baked in. This install repeats at runtime only for the
# dev stack, whose anonymous /app/node_modules volume can shadow them.
CMD npm install; npm start
