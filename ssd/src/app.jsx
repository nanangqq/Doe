import * as React from 'react'
import { createTriangle } from './webgpu'
import { fbApp } from './fb'

export default () => {
  React.useEffect(() => {
    // console.log(fbApp)
    createTriangle()
  }, [])

  return <canvas id="canvas-webgpu" width="800" height="600" />
}
