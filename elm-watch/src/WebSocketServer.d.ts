import WebSocket from "ws";
import { Port, PortChoice } from "./Port";
export type WebSocketServerMsg = {
    tag: "WebSocketClosed";
    webSocket: WebSocket;
} | {
    tag: "WebSocketConnected";
    webSocket: WebSocket;
    urlString: string;
} | {
    tag: "WebSocketMessageReceived";
    webSocket: WebSocket;
    data: WebSocket.Data;
} | {
    tag: "WebSocketServerError";
    error: WebSocketServerError;
};
type WebSocketServerError = {
    tag: "OtherError";
    error: Error;
} | {
    tag: "PortConflict";
    portChoice: PortChoice;
    error: Error;
};
export declare class WebSocketServer {
    private polyHttpServer;
    private webSocketServer;
    port: Port;
    private dispatch;
    private msgQueue;
    listening: Promise<void>;
    constructor(portChoice: PortChoice);
    dispatchToQueue: (msg: WebSocketServerMsg) => void;
    setDispatch(dispatch: (msg: WebSocketServerMsg) => void): void;
    unsetDispatch(): void;
    close(): Promise<void>;
}
export {};
