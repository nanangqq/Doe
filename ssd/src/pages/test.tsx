import React, { useEffect } from 'react'
import { clearCanvas, createTriangle, createSquare } from '../webgpu'
import { createGrid } from '../webgpu/grid'
import { Link } from 'react-router-dom'
// import { Outlet } from 'react-router-dom'

export default function TestPage() {
  useEffect(() => {
    createTriangle()
  }, [])

  return (
    <div>
      <Link to="/test/aa">aa</Link>
      <canvas id="canvas-webgpu" width="640" height="640" />
      <br />
      <button onClick={clearCanvas}>지우기</button>
      <button onClick={createSquare}>사각형</button>
      <button
        onClick={() => {
          createGrid()
        }}
      >
        그리드
      </button>
      {/* <div id="chilren">
        <Outlet />
      </div> */}
    </div>
  )
}
