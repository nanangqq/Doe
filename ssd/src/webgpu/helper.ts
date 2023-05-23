/// <reference types="@webgpu/types" />

export const checkWebGPUSupport = navigator.gpu
  ? 'Great, your current browser supports WebGPU!'
  : `Your current browser does not support WebGPU! Make sure you are on a system 
    with WebGPU enabled.`

export const useWebGPU = async (canvasId = 'canvas-webgpu') => {
  const checkgpu = checkWebGPUSupport
  if (checkgpu.includes('Your current browser does not support WebGPU!')) {
    console.log(checkgpu)
    throw 'Your current browser does not support WebGPU!'
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  if (!canvas) {
    console.log('Canvas not found!')
    throw 'Canvas not found!'
  }

  const context = canvas.getContext('webgpu')
  if (!context) {
    console.log('Context not found!')
    throw 'Context not found!'
  }

  const adapter = await navigator.gpu?.requestAdapter()
  // console.log(adapter)
  const device = await adapter?.requestDevice()
  // console.log(device)
  if (!device) {
    console.log('Device not found!')
    throw 'Device not found!'
  }

  return { canvas, context, adapter, device }
}
