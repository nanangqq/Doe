import * as React from 'react'
import { clearCanvas, createTriangle, createSquare } from './webgpu'
import { fbApp } from './fb'

export default () => {
  React.useEffect(() => {
    // console.log(fbApp)
    createTriangle()
  }, [])

  return (
    <div>
      <canvas id="canvas-webgpu" width="800" height="600" />
      <br />
      <button onClick={clearCanvas}>지우기</button>
      <button onClick={createSquare}>사각형</button>
    </div>
  )
}
