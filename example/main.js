import Elm from './src/Main.elm'

let app = Elm.Main.init({
  node: document.getElementById('app')
})

console.log({ app })