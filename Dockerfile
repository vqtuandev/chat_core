FROM node:11.13.0-alpine

RUN mkdir -p /usr/src/chat_core

WORKDIR /usr/src/chat_core

COPY . .
RUN npm install

ENV PORT=3010

EXPOSE $PORT

CMD ["npm", "start"]
