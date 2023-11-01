FROM node:18-alpine

WORKDIR /app/instagram_bot

COPY package.json ./

RUN npm install --silent

COPY . ./

CMD [ -d "node_modules" ] && npm run start