// Import this to your `src/vite-env.d.ts`
declare module "*.elm" {
  import { Component } from 'react'
  export default Component
}