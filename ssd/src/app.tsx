import * as React from 'react'
import { clearCanvas, createTriangle, createSquare, createGrid } from './webgpu'
import { fbApp } from './fb'

export default () => {
  React.useEffect(() => {
    // console.log(fbApp)
    createTriangle()
  }, [])

  return (
    <div>
      <canvas id="canvas-webgpu" width="640" height="640" />
      <br />
      <button onClick={clearCanvas}>지우기</button>
      <button onClick={createSquare}>사각형</button>
      <button onClick={createGrid}>그리드</button>
    </div>
  )
}
