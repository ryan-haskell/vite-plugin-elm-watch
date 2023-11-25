import * as Decode from "tiny-decoders";
export type PortChoice = {
    tag: "NoPort";
} | {
    tag: "PersistedPort";
    port: Port;
} | {
    tag: "PortFromConfig";
    port: Port;
};
export type Port = {
    tag: "Port";
    thePort: number;
};
export declare const Port: Decode.Decoder<Port, unknown>;
