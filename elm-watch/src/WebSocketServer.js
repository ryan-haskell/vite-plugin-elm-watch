import * as http from "http";
import * as https from "https";
import * as net from "net";
import * as util from "util";
import { Server as WsServer } from "ws";
import { CERTIFICATE } from "./Certificate";
// Inspired by: https://stackoverflow.com/a/42019773
class PolyHttpServer {
    constructor() {
        this.net = net.createServer();
        this.http = http.createServer();
        this.https = https.createServer(CERTIFICATE);
        this.net.on("connection", (socket) => {
            socket.once("data", (buffer) => {
                socket.pause();
                const server = buffer[0] === 22 ? this.https : this.http;
                socket.unshift(buffer);
                server.emit("connection", socket);
                server.on("close", () => {
                    socket.destroy();
                });
                process.nextTick(() => socket.resume());
            });
        });
    }
    listen(port) {
        this.net.listen(port);
    }
    async close() {
        return new Promise((resolve, reject) => {
            let numClosed = 0;
            const callback = (error) => {
                numClosed++;
                // istanbul ignore if
                if (error !== undefined && error.code !== "ERR_SERVER_NOT_RUNNING") {
                    reject(error);
                }
                else if (numClosed === 3) {
                    resolve();
                }
            };
            this.net.close(callback);
            this.http.close(callback);
            this.https.close(callback);
        });
    }
    onRequest(listener) {
        this.http.on("request", listener(false));
        this.https.on("request", listener(true));
    }
    onUpgrade(listener) {
        this.http.on("upgrade", listener);
        this.https.on("upgrade", listener);
    }
    onError(listener) {
        this.net.on("error", listener);
        this.http.on("error", listener);
        this.https.on("error", listener);
    }
    onceListening(listener) {
        this.net.once("listening", () => {
            listener(this.net.address());
        });
    }
}
export class WebSocketServer {
    constructor(portChoice) {
        this.polyHttpServer = new PolyHttpServer();
        this.webSocketServer = new WsServer({ noServer: true });
        this.msgQueue = [];
        this.dispatchToQueue = (msg) => {
            this.msgQueue.push(msg);
        };
        this.dispatch = this.dispatchToQueue;
        this.webSocketServer.on("connection", (webSocket, request) => {
            webSocket[util.inspect.custom] =
                // istanbul ignore next
                (_depth, options) => options.stylize("WebSocket", "special");
            this.dispatch({
                tag: "WebSocketConnected",
                webSocket,
                // `request.url` is always a string here, but the types says it can be undefined:
                // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/15808
                urlString: 
                // istanbul ignore next
                request.url ?? "/",
            });
            webSocket.on("message", (data) => {
                this.dispatch({
                    tag: "WebSocketMessageReceived",
                    webSocket,
                    data,
                });
            });
            webSocket.on("close", () => {
                this.dispatch({ tag: "WebSocketClosed", webSocket });
            });
            // istanbul ignore next
            webSocket.on("error", (error) => {
                this.dispatch({
                    tag: "WebSocketServerError",
                    error: { tag: "OtherError", error },
                });
            });
        });
        this.polyHttpServer.onError((error) => {
            this.dispatch({
                tag: "WebSocketServerError",
                error: error.code === "EADDRINUSE"
                    ? { tag: "PortConflict", portChoice, error }
                    : // istanbul ignore next
                        { tag: "OtherError", error },
            });
        });
        this.polyHttpServer.onRequest((isHttps) => (request, response) => {
            response.end(html(isHttps, request));
        });
        this.polyHttpServer.onUpgrade((request, socket, head) => {
            this.webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
                this.webSocketServer.emit("connection", webSocket, request);
            });
        });
        this.port = { tag: "Port", thePort: 0 };
        this.listening = new Promise((resolve) => {
            this.polyHttpServer.onceListening((address) => {
                this.port.thePort = address.port;
                resolve();
            });
        });
        this.polyHttpServer.listen(
        // If `port` is 0, the operating system will assign an arbitrary unused port.
        portChoice.tag === "NoPort" ? 0 : portChoice.port.thePort);
    }
    setDispatch(dispatch) {
        this.dispatch = dispatch;
        for (const msg of this.msgQueue) {
            // When testing, a change to elm.json gives a 5 ms room where queueing is needed.
            // That’s very unlikely to even be needed, and very hard to test.
            // istanbul ignore next
            dispatch(msg);
        }
    }
    unsetDispatch() {
        this.dispatch = this.dispatchToQueue;
    }
    async close() {
        this.unsetDispatch();
        // This terminates all connections.
        this.webSocketServer.close();
        await this.polyHttpServer.close();
        for (const webSocket of this.webSocketServer.clients) {
            webSocket.close();
        }
    }
}
function html(isHttps, request) {
    const { host, referer } = request.headers;
    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>elm-watch</title>
    <style>
      html {
        font-family: system-ui, sans-serif;
      }
    </style>
  </head>
  <body>
    <p>ℹ️ This is the elm-watch WebSocket server.</p>
    ${request.url === "/accept"
        ? isHttps
            ? `<p>✅ Certificate accepted. You may now ${maybeLink(referer !== undefined && new URL(referer).host !== host
                ? referer
                : undefined, "return to your page")}.</p>`
            : `<p>Did you mean to go to the ${maybeLink(host !== undefined ? `https://${host}${request.url}` : undefined, "HTTPS version of this page")} to accept elm-watch's self-signed certificate?</p>`
        : `<p>There's nothing interesting to see here: <a href="https://lydell.github.io/elm-watch/getting-started/#your-responsibilities">elm-watch is not a file server</a>.</p>`}
  </body>
</html>
  `.trim();
}
function maybeLink(href, text) {
    return href === undefined ? text : `<a href="${href}">${text}</a>`;
}
