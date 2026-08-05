FROM node:22

WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy source files but exclude tests
COPY public ./public
COPY src ./src
COPY tsconfig.json ./

# Remove test files to avoid compilation issues
RUN rm -rf src/tests

EXPOSE 3000

ENV CI=false
ENV SKIP_PREFLIGHT_CHECK=true

USER node

CMD ["npm", "start"]
