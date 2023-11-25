import { Color } from "./ElmMakeError";
import { Logger } from "./Logger";
export type Theme = {
    foreground: string;
    background: string;
    palette: {
        [key in Color]: string;
    };
};
export declare const COLOR_TO_TERMINAL_ESCAPE: Record<Color, string>;
export declare function getThemeFromTerminal(logger: Logger): Promise<Theme>;
