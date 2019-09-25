FROM node:12.10.0-buster

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
