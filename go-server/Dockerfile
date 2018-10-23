FROM golang:1.11 as builder
WORKDIR $GOPATH/src/mypackage/myapp/
COPY . .
RUN go get -d -v
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -v -installsuffix cgo -ldflags="-w -s" -o /go/bin/main

FROM scratch
ENTRYPOINT ["/main"]
COPY --from=builder /go/bin/main /main
