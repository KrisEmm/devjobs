FROM node:14.16.1-alpine3.11
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.9.0/wait /wait
RUN chmod +x /wait
EXPOSE 3000
CMD /wait && node ./index.js