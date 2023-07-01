import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Feature, Point, Polygon } from 'geojson'
import { v4 } from 'uuid'

import { useWebGPU } from '../webgpu/helper'
import testdata from '../geo/testdata'
import { createPolygonShader } from '../webgpu/shaders'

const createRenderer = async (canvasId: string) => {
    const { canvas, context, adapter, device } = await useWebGPU(canvasId)
    // console.log(canvas.width, canvas.height)
    // canvas.addEventListener('mousemove', (e) => {
    //   setIsMouseOnCanvas(true)
    //   const x = (e.offsetX - canvas.width / 2) / (canvas.width / 2)
    //   const y = (-e.offsetY + canvas.height / 2) / (canvas.height / 2)
    //   // console.log(x, y)

    // })
    const format = navigator.gpu.getPreferredCanvasFormat()

    context.configure({
        device: device,
        format: format,
    })

    const fc = testdata()
    const pol = fc.features[1] as Feature<Polygon>
    const pt = fc.features[0] as Feature<Point>

    const vertices = new Float32Array(pol.geometry.coordinates[0].flat())
    // console.log(vertices)
    const polVertsBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    device.queue.writeBuffer(polVertsBuffer, 0, vertices)

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

    const bindGroupLayout = device.createBindGroupLayout({
        label: 'pol Bind Group Layout',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {}, // uniform buffer
            },
        ],
    })

    // Create a uniform buffer that describes the grid.
    const uniformArray = new Float32Array([0, 0])
    // console.log(uniformArray)
    const uniformBuffer = device.createBuffer({
        label: 'Grid Uniforms',
        size: uniformArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    // console.log(uniformBuffer)
    device.queue.writeBuffer(uniformBuffer, 0, uniformArray)
    const bindGroup = device.createBindGroup({
        label: 'Cell renderer bind group A',
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: uniformBuffer },
            },
        ],
    })
    const pipelineLayout = device.createPipelineLayout({
        label: 'pol Pipeline Layout',
        bindGroupLayouts: [bindGroupLayout],
    })

    const polShaderModule = device.createShaderModule(createPolygonShader())

    const polPipeline = device.createRenderPipeline({
        label: 'pol pipeline',
        layout: pipelineLayout,
        vertex: {
            module: polShaderModule,
            entryPoint: 'vertexMain',
            buffers: [vertexBufferLayout],
        },
        fragment: {
            module: polShaderModule,
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

    const renderer = () => {
        const encoder = device.createCommandEncoder()
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, // New line
                    storeOp: 'store',
                },
            ],
        })

        pass.setBindGroup(0, bindGroup)
        pass.setPipeline(polPipeline)
        pass.setVertexBuffer(0, polVertsBuffer)
        pass.draw(5)

        pass.end()
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
    const [renderer, setRenderer] = useState<() => void>(() => () => {})
    const [mousePosition, setMousePosition] = useState<[number, number]>([0, 0])

    const init = () => {
        createRenderer(canvasId).then((renderer) => setRenderer(() => renderer))
    }
    useEffect(init, [])

    useEffect(() => {
        console.log(mousePosition)
        console.log(renderer)
        renderer()
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
            />
        </DefaultViewContainer>
    )
}

const DefaultViewContainer = styled.div<{ width: string; height: string }>`
    width: ${(props) => props.width};
    height: ${(props) => props.height};
`
