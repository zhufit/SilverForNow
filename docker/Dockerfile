FROM node:22-alpine
WORKDIR /app
COPY package.json server.cjs app.js sync.js calendar.js drag.js scenes.js sw.js index.html style.css background.css cover.svg ./
COPY assets ./assets
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "server.cjs"]
