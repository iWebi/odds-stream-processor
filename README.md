# Websockets consuming example

This example reads content from an HTTP api with response Content-Type of `text/stream` to continuously fanout the read contents to active Websocket connections.

This was an experiment to learn websockets in combination with a streaming API (as opposed to simple Chat application)

## Usage

### Deployment

Project requires

- NodeJS > 20.x
- AWS IAM User credentials with access to DynamoDB, SQS resources created by [websockets-sls-nodejs-example](https://github.com/iWebi/websockets-sls-nodejs-example)
- Update `config.env` with relevant details

Run commands:

```
$ npm run install
$ npm run start
```

A successful start will show output similar to

```bash
npm run start

> stream-fanout-to-websocket-clients@1.0.0 start
> npm run build && node --env-file config.env dist/index.js


> stream-fanout-to-websocket-clients@1.0.0 build
> tsc

listening for add/remove of connection ids from websocket clients using  https://sqs.us-west-2.amazonaws.com/12345678/connectionids-dev.fifo
sending chunk to 0 clients
sending chunk to 0 clients
sending chunk to 1 clients
sending chunk to 1 clients
sending chunk to 1 clients
sending chunk to 1 clients

```
