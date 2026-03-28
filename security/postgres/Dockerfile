FROM postgres:15-alpine

COPY postgres-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/postgres-entrypoint.sh

ENTRYPOINT ["postgres-entrypoint.sh"]

CMD ["postgres"]