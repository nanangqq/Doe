import { useWebGPU } from './helper'
import {
  createGridShader,
  createComputeShader,
  createCellBoxShader,
} from './shaders'

export const createGrid = async (
  { cellSize, canvasWidth, canvasHeight, cellBoxRt } = {
    cellSize: 20,
    canvasWidth: 640,
    canvasHeight: 640,
    cellBoxRt: 0.9,
  }
) => {
  const GRID_SIZE_X = Math.floor(canvasWidth / cellSize)
  const GRID_SIZE_Y = Math.floor(canvasHeight / cellSize)
  const UPDATE_INTERVAL = 500 // milliseconds
  const WORKGROUP_SIZE = 8
  const CANVAS_SIZE_X = canvasWidth
  const CANVAS_SIZE_Y = canvasHeight
  let IS_MOUSE_ON_CANVAS = false
  const SELECTED_CELL = [-1, -1]

  const useCanvasGridCheckEvent = async (render: () => void) => {
    const { canvas } = await useWebGPU()
    canvas.addEventListener('mousemove', (e) => {
      //   console.log(e)
      IS_MOUSE_ON_CANVAS = true
      const x = e.offsetX
      const y = e.offsetY
      const cellX = Math.floor((x / CANVAS_SIZE_X) * GRID_SIZE_X)
      const cellY =
        GRID_SIZE_Y - 1 - Math.floor((y / CANVAS_SIZE_Y) * GRID_SIZE_Y)
      if (cellX === SELECTED_CELL[0] && cellY === SELECTED_CELL[1]) {
        return
      }
      console.log(cellX, cellY, IS_MOUSE_ON_CANVAS)
      SELECTED_CELL[0] = cellX
      SELECTED_CELL[1] = cellY
      render()
    })

    canvas.addEventListener('mouseleave', (e) => {
      IS_MOUSE_ON_CANVAS = false
      console.log(IS_MOUSE_ON_CANVAS)
      SELECTED_CELL[0] = -1
      SELECTED_CELL[1] = -1
    })
  }

  const createGridCore = async () => {
    const { context, device } = await useWebGPU()
    // const format = 'bgra8unorm'
    const format = navigator.gpu.getPreferredCanvasFormat()

    context.configure({
      device: device,
      format: format,
    })

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

    const cellBox = new Float32Array([
      //   X,
      //   Y,
      -cellBoxRt, // pt 1
      -cellBoxRt,
      cellBoxRt, // pt 2
      -cellBoxRt,
      cellBoxRt, // pt 3
      cellBoxRt,
      -cellBoxRt, // pt 4
      cellBoxRt,
      -cellBoxRt, // pt 1
      -cellBoxRt,
    ])

    const cellBoxBuffer = device.createBuffer({
      label: 'Cell box',
      size: cellBox.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    device.queue.writeBuffer(cellBoxBuffer, /*bufferOffset=*/ 0, cellBox)

    const vertexBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [
        {
          format: 'float32x2',
          offset: 0,
          shaderLocation: 0, // Position, see vertex shader
        },
      ],
    }

    // Create the bind group layout and pipeline layout.
    const bindGroupLayout = device.createBindGroupLayout({
      label: 'Cell Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility:
            GPUShaderStage.VERTEX |
            GPUShaderStage.FRAGMENT |
            GPUShaderStage.COMPUTE,
          buffer: {}, // Grid uniform buffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }, // Cell state input buffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }, // Cell state output buffer
        },
        {
          binding: 3,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }, // Cell state input buffer
        },
      ],
    })

    const pipelineLayout = device.createPipelineLayout({
      label: 'Cell Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    })

    const cellShaderModule = device.createShaderModule(createGridShader())
    const cellBoxShaderModule = device.createShaderModule(createCellBoxShader())

    const cellPipeline = device.createRenderPipeline({
      label: 'Cell pipeline',
      layout: pipelineLayout,
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

    const cellBoxPipeline = device.createRenderPipeline({
      label: 'Cell pipeline',
      layout: pipelineLayout,
      vertex: {
        module: cellBoxShaderModule,
        entryPoint: 'vertexMain',
        buffers: [vertexBufferLayout],
      },
      fragment: {
        module: cellBoxShaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format,
          },
        ],
      },
      primitive: {
        topology: 'line-strip',
      },
    })

    // Create the compute shader that will process the simulation.
    const simulationShaderModule = device.createShaderModule(
      createComputeShader(WORKGROUP_SIZE)
    )

    // Create a compute pipeline that updates the game state.
    const simulationPipeline = device.createComputePipeline({
      label: 'Simulation pipeline',
      layout: pipelineLayout,
      compute: {
        module: simulationShaderModule,
        entryPoint: 'computeMain',
      },
    })

    // Create a uniform buffer that describes the grid.
    const uniformArray = new Float32Array([GRID_SIZE_X, GRID_SIZE_Y])
    // console.log(uniformArray)
    const uniformBuffer = device.createBuffer({
      label: 'Grid Uniforms',
      size: uniformArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    // console.log(uniformBuffer)
    device.queue.writeBuffer(uniformBuffer, 0, uniformArray)

    // Create an array representing the active state of each cell.
    const cellStateArray = new Uint32Array(GRID_SIZE_X * GRID_SIZE_Y)
    // console.log(cellStateArray)

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

    // Set each cell to a random state, then copy the JavaScript array into
    // the storage buffer.
    for (let i = 0; i < cellStateArray.length; ++i) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0
    }
    device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray)

    const cellBoxArray = new Float32Array(SELECTED_CELL)

    // Create two storage buffers to hold the cell state.
    const cellBoxArrayStorage = device.createBuffer({
      label: 'Cell Box Array',
      size: cellBoxArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    device.queue.writeBuffer(cellBoxArrayStorage, 0, cellBoxArray)

    const bindGroups = [
      device.createBindGroup({
        label: 'Cell renderer bind group A',
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: cellStateStorage[0] },
          },
          {
            binding: 2,
            resource: { buffer: cellStateStorage[1] },
          },
          {
            binding: 3,
            resource: { buffer: cellBoxArrayStorage },
          },
        ],
      }),
      device.createBindGroup({
        label: 'Cell renderer bind group B',
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
          {
            binding: 1,
            resource: { buffer: cellStateStorage[1] },
          },
          {
            binding: 2,
            resource: { buffer: cellStateStorage[0] },
          },
          {
            binding: 3,
            resource: { buffer: cellBoxArrayStorage },
          },
        ],
      }),
    ]

    let step = 0 // Track how many simulation steps have been run

    function updateGrid() {
      const cellBoxArray = new Float32Array(SELECTED_CELL)
      device.queue.writeBuffer(cellBoxArrayStorage, 0, cellBoxArray)

      const encoder = device.createCommandEncoder()

      // Start a compute pass
      const computePass = encoder.beginComputePass()

      computePass.setPipeline(simulationPipeline)
      computePass.setBindGroup(0, bindGroups[step % 2])
      const workgroupCount = Math.ceil(GRID_SIZE_X / WORKGROUP_SIZE)
      computePass.dispatchWorkgroups(workgroupCount, workgroupCount)
      computePass.end()

      step++ // Increment the step count

      // Start a render pass
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      })

      // Draw the grid.
      pass.setPipeline(cellPipeline)
      pass.setBindGroup(0, bindGroups[step % 2]) // Updated!
      pass.setVertexBuffer(0, vertexBuffer)
      pass.draw(vertices.length / 2, GRID_SIZE_X * GRID_SIZE_Y)

      // Draw the cell box.
      pass.setPipeline(cellBoxPipeline)
      pass.setVertexBuffer(0, cellBoxBuffer)
      pass.draw(5)

      // End the render pass and submit the command buffer
      pass.end()
      device.queue.submit([encoder.finish()])
    }

    setInterval(updateGrid, UPDATE_INTERVAL)
    useCanvasGridCheckEvent(updateGrid)
  }

  createGridCore()
}
