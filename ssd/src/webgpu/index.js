import { checkWebGPUSupport } from './helper'
import { defaultShader } from './shaders'

export const createTriangle = async (color = '(1.0,1.0,1.0,1.0)') => {
  const checkgpu = checkWebGPUSupport
  if (checkgpu.includes('Your current browser does not support WebGPU!')) {
    console.log(checkgpu)
    throw 'Your current browser does not support WebGPU!'
  }

  const canvas = document.getElementById('canvas-webgpu')
  const adapter = await navigator.gpu?.requestAdapter()
  const device = await adapter?.requestDevice()

  const context = canvas.getContext('webgpu')
  const format = 'bgra8unorm'

  context.configure({
    device: device,
    format: format,
    alphaMode: 'opaque',
  })

  const shader = defaultShader(color)
  console.log(shader)

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
