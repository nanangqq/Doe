/// <reference types="@webgpu/types" />

import { Feature, Polygon } from 'geojson'
import { createDefaultPolygonShader } from './shaders'

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

export const createTestPolygonDrawingSet = (
    pol: Feature<Polygon>,
    device: GPUDevice,
) => {
    const vertices = new Float32Array(pol.geometry.coordinates[0].flat())

    const polVertsBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    device.queue.writeBuffer(polVertsBuffer, 0, vertices)

    const polVertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 8,
        attributes: [
            {
                format: 'float32x2',
                offset: 0,
                shaderLocation: 0, // Position, see vertex shader
            },
        ],
    }

    const polColorArray = new Float32Array([1, 1, 0])
    const polColorBuffer = device.createBuffer({
        label: 'polColor',
        size: polColorArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(polColorBuffer, 0, polColorArray)

    const polBindGroupLayout = device.createBindGroupLayout({
        label: 'pol Bind Group Layout',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {}, // uniform buffer
            },
        ],
    })

    const polBindGroup = device.createBindGroup({
        label: 'pol bind group',
        layout: polBindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: polColorBuffer },
            },
        ],
    })

    const polPipelineLayout = device.createPipelineLayout({
        label: 'pol Pipeline Layout',
        bindGroupLayouts: [polBindGroupLayout],
    })

    const polShaderModule = device.createShaderModule(
        createDefaultPolygonShader(),
    )

    const polPipeline = device.createRenderPipeline({
        label: 'pol pipeline',
        layout: polPipelineLayout,
        vertex: {
            module: polShaderModule,
            entryPoint: 'vertexMain',
            buffers: [polVertexBufferLayout],
        },
        fragment: {
            module: polShaderModule,
            entryPoint: 'fragmentMain',
            targets: [
                {
                    format: navigator.gpu.getPreferredCanvasFormat(),
                },
            ],
        },
        primitive: {
            topology: 'line-strip',
        },
    })

    const renderPolPass = (
        encoder: GPUCommandEncoder,
        context: GPUCanvasContext,
    ) => {
        const polRenderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'load',
                    storeOp: 'store',
                },
            ],
        })

        polRenderPass.setBindGroup(0, polBindGroup)
        polRenderPass.setVertexBuffer(0, polVertsBuffer)

        polRenderPass.setPipeline(polPipeline)
        polRenderPass.draw(5)

        polRenderPass.end()
    }

    return renderPolPass
}

export const renderBackgroundPassFactory =
    (bgcolor: { r: number; g: number; b: number }) =>
    (encoder: GPUCommandEncoder, context: GPUCanvasContext) => {
        const backgroundPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    clearValue: { ...bgcolor, a: 1 },
                    storeOp: 'store',
                },
            ],
        })
        backgroundPass.end()
    }
