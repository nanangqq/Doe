import * as React from 'react'
import { createTriangle } from './webgpu'

export default () => {
  React.useEffect(() => {
    createTriangle()
  }, [])

  return <canvas id="canvas-webgpu" width="800" height="600" />
}
