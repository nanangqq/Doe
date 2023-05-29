import React, { useEffect } from 'react'
import { createGrid } from '../webgpu/grid'

export default function RootPage() {
  const width = window.innerWidth
  const height = window.innerHeight

  useEffect(() => {
    createGrid({
      cellSize: 10,
      canvasWidth: width,
      canvasHeight: height,
      cellBoxRt: 1,
    })
  }, [])

  return (
    <>
      <canvas id="canvas-webgpu" width={width} height={height} />
    </>
  )
}
