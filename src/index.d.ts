import { Plugin } from "vite"

export type Options = {
  output?: 'default' | 'react',
  mode?: 'auto' | 'standard' | 'debug' | 'optimize' | 'minify'
  isBodyPatchEnabled?: boolean
}
declare function elm(opts?: Options): Plugin
export default elm

declare module 'vite-plugin-elm-watch' {
  export default elm
}