FROM golang:1.23-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/retrosnap-api ./cmd/api

FROM alpine:3.20

RUN adduser -D -H retrosnap
USER retrosnap

WORKDIR /app
COPY --from=build /out/retrosnap-api /app/retrosnap-api
COPY migrations /app/migrations

EXPOSE 8080

ENTRYPOINT ["/app/retrosnap-api"]
