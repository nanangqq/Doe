import { checkWebGPUSupport } from './helper'
import { defaultShader } from './shaders'

const useWebGPU = async (canvasId = 'canvas-webgpu') => {
  const checkgpu = checkWebGPUSupport
  if (checkgpu.includes('Your current browser does not support WebGPU!')) {
    console.log(checkgpu)
    throw 'Your current browser does not support WebGPU!'
  }

  const canvas = document.getElementById(canvasId)
  const adapter = await navigator.gpu?.requestAdapter()
  // console.log(adapter)
  const device = await adapter?.requestDevice()
  // console.log(device)

  return [canvas, adapter, device]
}

export const createTriangle = async (color = '(1.0,1.0,1.0,1.0)') => {
  const [canvas, adapter, device] = await useWebGPU()
  const context = canvas.getContext('webgpu')
  // const format = 'bgra8unorm'
  const format = navigator.gpu.getPreferredCanvasFormat()
  console.log(format)

  context.configure({
    device: device,
    format: format,
    alphaMode: 'opaque',
  })

  const shader = defaultShader(color)

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: shader.vertex,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: shader.fragment,
      }),
      entryPoint: 'main',
      targets: [
        {
          format,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  })

  const commandEncoder = device.createCommandEncoder()
  const textureView = context.getCurrentTexture().createView()
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.5, g: 0.5, b: 0.8, a: 1.0 }, //background color
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  })
  renderPass.setPipeline(pipeline)
  renderPass.draw(3, 1, 0, 0)
  renderPass.end()

  device.queue.submit([commandEncoder.finish()])
}

export const clearCanvas = async () => {
  const [canvas, adapter, device] = await useWebGPU()
  const context = canvas.getContext('webgpu')
  const format = navigator.gpu.getPreferredCanvasFormat()
  // console.log(format)

  context.configure({
    device: device,
    format: format,
  })

  const encoder = device.createCommandEncoder()

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  })

  pass.end()

  const commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])
}
