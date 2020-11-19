FROM node:12-alpine
WORKDIR /
COPY . .
EXPOSE 3000
RUN npm install
CMD ["npm", "start"]
