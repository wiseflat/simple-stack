FROM alpine:latest

RUN mkdir /www/

COPY ui/ /www

RUN addgroup --gid 1000 nodejs \
    && adduser --uid 1000 --system --home /var/lib/nodejs --ingroup "nodejs" --disabled-password --shell /usr/sbin/nologin nodejs \
    && chown -Rf nodejs:nodejs /www/ui

RUN apk add --no-cache nodejs npm

VOLUME /www/

WORKDIR /www/ui

RUN npm install

EXPOSE 8000

CMD [ "npm", "start" ]