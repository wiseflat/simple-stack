FROM alpine:latest

RUN mkdir /www/

COPY . /www

RUN addgroup --gid 1000 nodejs \
    && adduser --uid 1000 --system --home /var/lib/nodejs --ingroup "nodejs" --disabled-password --shell /usr/sbin/nologin nodejs \
    && chown -Rf nodejs:nodejs /www

RUN apk add --no-cache nodejs npm

VOLUME /www/

WORKDIR /www

RUN npm install

EXPOSE 8000

CMD [ "npm", "start" ]