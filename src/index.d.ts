import { Plugin } from "vite"

declare module 'vite-plugin-elm-watch' {
  export default function elmWatchPlugin(args: {
    mode: 'auto' | 'standard' | 'debug' | 'optimize' | 'minify',
    isBodyPatchEnabled: boolean
  }): Plugin
}
