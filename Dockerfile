FROM alpine:3.4

RUN apk add --no-cache python && mkdir /app

COPY css /app/css
COPY js /app/js
COPY libs /app/libs
COPY index.html /app/index.html
COPY graph.gexf /app/graph.gexf

EXPOSE 8000

USER nobody

WORKDIR /app

CMD ["python", "-m", "SimpleHTTPServer", "8000"]
