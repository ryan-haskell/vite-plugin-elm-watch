import os from 'os'
import fs from 'fs'
import path from 'path'
import { make } from '../elm-watch/src/SpawnElm.js'
import { inject } from '../elm-watch/src/Inject.js'


let elmEntrypointObject = {}

const initElmWatchWindowVarCode = `
let { __ELM_WATCH } = window;
if (typeof __ELM_WATCH !== "object" || __ELM_WATCH === null) {
    __ELM_WATCH = {};
    Object.defineProperty(window, "__ELM_WATCH", { value: __ELM_WATCH });
}
`

const hmrClientCode = `
if (import.meta.hot) {
  import.meta.hot.on('special-update', (data) => {
    console.log("SERVER", data)
  })
  import.meta.hot.on('vite:error', (err) => {
    console.log('CAUGHT YA', err)
  })
}
`

/**
 * @returns {import("vite").Plugin}
 */
export default function elmWatchPlugin() {
  return {
    name: 'elm-watch',
    // TODO: Think about file deletion! 🚨
    async handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.elm')) {
        let elmEntrypoints = Object.keys(elmEntrypointObject)
        ctx.server.ws.send({
          type: 'custom',
          event: 'special-update',
          data: {
            fileChanged: ctx.file,
            entrypoints: elmEntrypoints
          }
        })
        let foo = elmEntrypoints.map(id => ctx.server.moduleGraph.getModuleById(id))
        console.log({ foo })
        return foo
      }
    },
    async load(id) {
      if (id.endsWith('.elm')) {
        console.log(id)
        elmEntrypointObject[id] = true

        let tmpDir = os.tmpdir()
        let tempOutputFilepath = path.join(tmpDir, 'out.js')

        let compilationMode = 'standard'

        let elmMake = make({
          elmJsonPath: {
            tag: 'ElmJsonPath', theElmJsonPath: {
              tag: 'AbsolutePath',
              absolutePath: path.join(process.cwd(), 'elm.json')
            }
          },
          compilationMode,
          inputs: [
            { tag: 'InputPath', theInputPath: { tag: "AbsolutePath", absolutePath: id } }
          ],
          outputPath: {
            tag: 'OutputPath',
            theOutputPath: { tag: 'AbsolutePath', absolutePath: tempOutputFilepath }
          },
          env: process.env,
          getNow: () => new Date()
        })

        let result = await elmMake.promise

        switch (result.tag) {
          case 'Success':
            let compiledElmJs = fs.readFileSync(tempOutputFilepath, { encoding: 'utf-8' })
            let elmWatchCompiledJs = inject(compilationMode, compiledElmJs)
            let esmCompiledElmJs = `export default ({ run () { ${initElmWatchWindowVarCode}; ${elmWatchCompiledJs}; return window.Elm } }).run(); ${hmrClientCode}`
            return esmCompiledElmJs
          default:
            throw new Error(JSON.stringify(result, null, 2))
        }

      }
    }
  }
}