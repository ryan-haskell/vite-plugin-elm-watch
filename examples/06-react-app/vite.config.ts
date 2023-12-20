import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import elm from '../../src/index.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    elm({ output: 'react' })
  ],
})
