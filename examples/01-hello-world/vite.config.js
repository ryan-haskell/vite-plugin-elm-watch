import { defineConfig } from "vite";

// ⚠️ Use this line instead for your own projects: 👇
//    import elm from 'vite-plugin-elm-watch'
import elm from '../../src/index.js'

export default defineConfig({
  plugins: [
    elm()
  ]
})