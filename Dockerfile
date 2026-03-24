FROM node:lts as build
WORKDIR /app
COPY . .
RUN yarn install
RUN yarn run build

FROM nginx:alpine
COPY --from=build /app/index.html /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html/dist
COPY --from=build /app/css /usr/share/nginx/html/css
VOLUME [ "/usr/share/nginx/html" ]
