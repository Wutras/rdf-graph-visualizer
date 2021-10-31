FROM node:lts-alpine as build

WORKDIR /app

COPY . .
RUN npm ci
ENTRYPOINT [ "npm", "start" ]

# stardog-js is causing build issues
#RUN npm run build

#FROM nginx:stable-alpine as production

#COPY --from=build /app/build /usr/share/nginx/html

#COPY ./nginx/certs /etc/nginx/certs
#COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

#ENTRYPOINT [ "nginx", "-g", "daemon off;" ]