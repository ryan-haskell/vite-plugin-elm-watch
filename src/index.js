import os from 'os'
import fs from 'fs'
import path from 'path'
import { make } from '../elm-watch/src/SpawnElm.js'

export default function elmWatchPlugin() {
  return {
    name: 'elm-watch',
    async load(id) {
      if (id.endsWith('.elm')) {
        let tmpDir = os.tmpdir()
        let tempOutputFilepath = path.join(tmpDir, 'out.js')

        let elmMake = make({
          elmJsonPath: {
            tag: 'ElmJsonPath', theElmJsonPath: {
              tag: 'AbsolutePath',
              absolutePath: path.join(process.cwd(), 'elm.json')
            }
          },
          compilationMode: 'standard',
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
            return `export default ({ run () { ${compiledElmJs}; return this.Elm } }).run()`
          default:
            throw new Error(JSON.stringify(result, null, 2))
        }

      }
    }
  }
}