import { checkWebGPUSupport } from './helper'
import { defaultShader, createSquareShader, createGridShader } from './shaders'

const GRID_SIZE = 32
const UPDATE_INTERVAL = 500 // Update every 200ms (5 times/sec)

const useWebGPU = async (canvasId = 'canvas-webgpu') => {
  const checkgpu = checkWebGPUSupport
  if (checkgpu.includes('Your current browser does not support WebGPU!')) {
    console.log(checkgpu)
    throw 'Your current browser does not support WebGPU!'
  }

  const canvas = document.getElementById(canvasId)
  if (!canvas) {
    console.log('Canvas not found!')
    throw 'Canvas not found!'
  }

  const adapter = await navigator.gpu?.requestAdapter()
  // console.log(adapter)
  const device = await adapter?.requestDevice()
  // console.log(device)

  return { canvas, adapter, device }
}

export const createGrid = async () => {
  const { canvas, adapter, device } = await useWebGPU()
  const context = canvas.getContext('webgpu')
  // const format = 'bgra8unorm'
  const format = navigator.gpu.getPreferredCanvasFormat()

  let step = 0 // Track how many simulation steps have been run

  // Create an array representing the active state of each cell.
  const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)
  // console.log(cellStateArray)

  // Create a storage buffer to hold the cell state.
  // const cellStateStorage = device.createBuffer({
  //   label: 'Cell State',
  //   size: cellStateArray.byteLength,
  //   usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  // })

  // for (let i = 0; i < cellStateArray.length; i += 3) {
  //   cellStateArray[i] = 1
  // }
  // device.queue.writeBuffer(cellStateStorage, 0, cellStateArray)

  // Create two storage buffers to hold the cell state.
  const cellStateStorage = [
    device.createBuffer({
      label: 'Cell State A',
      size: cellStateArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }),
    device.createBuffer({
      label: 'Cell State B',
      size: cellStateArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }),
  ]

  // Mark every third cell of the first grid as active.
  for (let i = 0; i < cellStateArray.length; i += 3) {
    cellStateArray[i] = 1
  }
  device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray)

  // Mark every other cell of the second grid as active.
  for (let i = 0; i < cellStateArray.length; i++) {
    cellStateArray[i] = i % 2
  }
  device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray)

  // Create a uniform buffer that describes the grid.
  const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE])
  // console.log(uniformArray)
  const uniformBuffer = device.createBuffer({
    label: 'Grid Uniforms',
    size: uniformArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  // console.log(uniformBuffer)
  device.queue.writeBuffer(uniformBuffer, 0, uniformArray)

  const vertices = new Float32Array([
    //   X,
    //   Y,

    -0.8, // Triangle 1
    -0.8,
    0.8,
    -0.8,
    0.8,
    0.8,

    -0.8, // Triangle 2
    -0.8,
    0.8,
    0.8,
    -0.8,
    0.8,
  ])

  const vertexBuffer = device.createBuffer({
    label: 'Cell vertices',
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })

  device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices)

  const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [
      {
        format: 'float32x2',
        offset: 0,
        shaderLocation: 0, // Position, see vertex shader
      },
    ],
  }

  const cellShaderModule = device.createShaderModule(createGridShader())

  const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: 'auto',
    vertex: {
      module: cellShaderModule,
      entryPoint: 'vertexMain',
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: 'fragmentMain',
      targets: [
        {
          format,
        },
      ],
    },
  })

  // const bindGroup = device.createBindGroup({
  //   label: 'Cell renderer bind group',
  //   layout: cellPipeline.getBindGroupLayout(0),
  //   entries: [
  //     {
  //       binding: 0,
  //       resource: { buffer: uniformBuffer },
  //     },
  //     {
  //       binding: 1,
  //       resource: { buffer: cellStateStorage },
  //     },
  //   ],
  // })

  const bindGroups = [
    device.createBindGroup({
      label: 'Cell renderer bind group A',
      layout: cellPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: cellStateStorage[0] },
        },
      ],
    }),
    device.createBindGroup({
      label: 'Cell renderer bind group B',
      layout: cellPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: cellStateStorage[1] },
        },
      ],
    }),
  ]

  context.configure({
    device: device,
    format: format,
  })

  // const encoder = device.createCommandEncoder()

  // const pass = encoder.beginRenderPass({
  //   colorAttachments: [
  //     {
  //       view: context.getCurrentTexture().createView(),
  //       loadOp: 'clear',
  //       // clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 0 }, // New line
  //       storeOp: 'store',
  //     },
  //   ],
  // })

  // pass.setPipeline(cellPipeline)
  // pass.setVertexBuffer(0, vertexBuffer)
  // pass.setBindGroup(0, bindGroup)
  // pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE) // 6 vertices

  // pass.end()

  // const commandBuffer = encoder.finish()
  // device.queue.submit([commandBuffer])

  function updateGrid() {
    step++ // Increment the step count

    // Start a render pass
    const encoder = device.createCommandEncoder()

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          // clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 0 }, // New line
          storeOp: 'store',
        },
      ],
    })

    // Draw the grid.
    pass.setPipeline(cellPipeline)
    pass.setVertexBuffer(0, vertexBuffer)
    pass.setBindGroup(0, bindGroups[step % 2]) // Updated!
    pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE)

    // End the render pass and submit the command buffer
    pass.end()
    device.queue.submit([encoder.finish()])
  }

  setInterval(updateGrid, UPDATE_INTERVAL)
}

export const createTriangle = async (color = '(1.0, 1.0, 1.0, 0.5)') => {
  const { canvas, adapter, device } = await useWebGPU()
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
        clearValue: { r: 0, g: 0, b: 0.4, a: 1 }, //background color
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
  const { canvas, adapter, device } = await useWebGPU()
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
        clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 0 }, // New line
        storeOp: 'store',
      },
    ],
  })

  pass.end()

  const commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])
}

export const createSquare = async () => {
  const { canvas, adapter, device } = await useWebGPU()

  const vertices = new Float32Array([
    //   X,
    //   Y,

    -0.8, // Triangle 1
    -0.8,
    0.8,
    -0.8,
    0.8,
    0.8,

    -0.8, // Triangle 2
    -0.8,
    0.8,
    0.8,
    -0.8,
    0.8,
  ])

  const vertexBuffer = device.createBuffer({
    label: 'Cell vertices',
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })

  device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices)

  const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [
      {
        format: 'float32x2',
        offset: 0,
        shaderLocation: 0, // Position, see vertex shader
      },
    ],
  }

  const cellShaderModule = device.createShaderModule(createSquareShader())

  const format = navigator.gpu.getPreferredCanvasFormat()
  // console.log(format)

  const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: 'auto',
    vertex: {
      module: cellShaderModule,
      entryPoint: 'vertexMain',
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: 'fragmentMain',
      targets: [
        {
          format,
        },
      ],
    },
  })

  const context = canvas.getContext('webgpu')

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
        clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 0 }, // New line
        storeOp: 'store',
      },
    ],
  })

  pass.setPipeline(cellPipeline)
  pass.setVertexBuffer(0, vertexBuffer)
  pass.draw(vertices.length / 2) // 6 vertices

  pass.end()

  const commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])
}
