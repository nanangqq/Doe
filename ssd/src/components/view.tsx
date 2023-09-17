import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Feature, Point, Polygon } from 'geojson'
import { v4 } from 'uuid'

import { createTestPolygonDrawingSet, useWebGPU } from '../webgpu/helper'
import testdata from '../geo/testdata'
import { createPolygonShader } from '../webgpu/shaders'

const createRenderer = async (canvasId: string) => {
    const { canvas, context, adapter, device } = await useWebGPU(canvasId)
    // console.log(canvas.width, canvas.height)
    const format = navigator.gpu.getPreferredCanvasFormat()

    context.configure({
        device: device,
        format: format,
    })

    const fc = testdata()
    const pol = fc.features[1] as Feature<Polygon>
    // const pt = fc.features[0] as Feature<Point>

    const vertices = new Float32Array(pol.geometry.coordinates[0].flat())

    const vertsBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    device.queue.writeBuffer(vertsBuffer, 0, vertices)

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

    // Create a uniform buffer that describes some stage value.
    const uniformArray = new Float32Array([0, 1, 0])
    const uniformBuffer = device.createBuffer({
        label: 'Uniform',
        size: uniformArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(uniformBuffer, 0, uniformArray)

    // create a storage buffer to store mouse position
    const mousePositionArray = new Float32Array([0, 0])
    const mousePositionStorage = device.createBuffer({
        label: 'mousePosition',
        size: mousePositionArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(mousePositionStorage, 0, mousePositionArray)

    const bindGroupLayout = device.createBindGroupLayout({
        label: 'Bind Group Layout',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {}, // uniform buffer
            },
            {
                binding: 1,
                visibility:
                    GPUShaderStage.VERTEX |
                    GPUShaderStage.FRAGMENT |
                    GPUShaderStage.COMPUTE,
                buffer: { type: 'read-only-storage' }, // Cell state input buffer
            },
        ],
    })

    const bindGroup = device.createBindGroup({
        label: 'bind group',
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: uniformBuffer },
            },
            {
                binding: 1,
                resource: { buffer: mousePositionStorage },
            },
        ],
    })

    const { polVertsBuffer, polBindGroup, polPipeline } =
        createTestPolygonDrawingSet(pol, device)

    const pipelineLayout = device.createPipelineLayout({
        label: 'Pipeline Layout',
        bindGroupLayouts: [bindGroupLayout],
    })

    const shaderModule = device.createShaderModule(createPolygonShader())

    const pipeline = device.createRenderPipeline({
        label: 'pipeline',
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: 'vertexMain',
            buffers: [vertexBufferLayout],
        },
        fragment: {
            module: shaderModule,
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

    const renderer = (mousePosition: [number, number] = [0, 0]) => {
        const encoder = device.createCommandEncoder()

        const backgroundPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
                    storeOp: 'store',
                },
            ],
        })
        backgroundPass.end()

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

        const mousePositionPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'load',
                    storeOp: 'store',
                },
            ],
        })
        device.queue.writeBuffer(
            mousePositionStorage,
            0,
            new Float32Array(mousePosition),
        )

        mousePositionPass.setBindGroup(0, bindGroup)
        mousePositionPass.setVertexBuffer(0, vertsBuffer)

        mousePositionPass.setPipeline(pipeline)
        mousePositionPass.draw(5)

        mousePositionPass.end()

        device.queue.submit([encoder.finish()])
    }

    return renderer
}

export default function ViewComponent({
    width,
    height,
    unit = 'mm',
}: {
    width: string
    height: string
    unit?: 'mm' | 'inch'
}) {
    const canvasId = useMemo(() => `view-canvas-${v4()}`, [])
    const [isMouseOnCanvas, setIsMouseOnCanvas] = useState(false)
    const [renderer, setRenderer] = useState<
        Awaited<ReturnType<typeof createRenderer>>
    >(() => () => {})
    const [mousePosition, setMousePosition] = useState<[number, number]>([0, 0])

    const init = () => {
        createRenderer(canvasId).then((renderer) => setRenderer(() => renderer))
    }
    useEffect(init, [])

    useEffect(() => {
        // console.log(mousePosition)
        renderer(mousePosition)
    }, [mousePosition, renderer])

    return (
        <DefaultViewContainer
            className="view-container"
            width={width}
            height={height}
        >
            <canvas
                // 캔버스는 width, height를 단순 숫자값으로 받아서 px단위 크기로 사이즈가 정해짐.
                // style로 사이즈 넣으면 기본사이즈에서 뻥튀기 되는 현상 나타남.
                // 숫자 뒤에 %, px 등 단위 넣어져도 무시하고 숫자값으로 받아들임.
                id={canvasId}
                width={width}
                height={height}
                onMouseMove={(e) => {
                    setIsMouseOnCanvas(true)
                    const x =
                        (e.nativeEvent.offsetX -
                            Number(width.replace('px', '')) / 2) /
                        (Number(width.replace('px', '')) / 2)
                    const y =
                        (-e.nativeEvent.offsetY +
                            Number(height.replace('px', '')) / 2) /
                        (Number(height.replace('px', '')) / 2)
                    setMousePosition([x, y])
                }}
                style={{
                    cursor: 'none',
                }}
            />
        </DefaultViewContainer>
    )
}

const DefaultViewContainer = styled.div<{ width: string; height: string }>`
    width: ${(props) => props.width};
    height: ${(props) => props.height};
`
