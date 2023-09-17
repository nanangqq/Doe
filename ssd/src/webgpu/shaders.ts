export const defaultShader = (color) => {
    const vertex = /* wgsl */ `
        @vertex
        fn main(@builtin(vertex_index) VertexIndex: u32) -> @builtin(position) vec4<f32> {
            let h = sqrt(3.0)*0.5;
            var pos = array<vec2<f32>, 3>(
                vec2<f32>(0.0, h*0.5),
                vec2<f32>(-0.5, -h*0.5),
                vec2<f32>(0.5, -h*0.5));
            return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
        }
    `

    const fragment = /* wgsl */ `
        @fragment
        fn main() -> @location(0) vec4<f32> {
            return vec4<f32>${color};
        }
    `
    return { vertex, fragment }
}

export const createCellBoxShader = () => ({
    label: 'Cell box shader',
    code: /* wgsl */ `
    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(3) var<storage> selectedCell: array<f32>;

    @vertex
    fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {

      // Compute the cell coordinate from the instance_index
      let cell = vec2f(selectedCell[0], selectedCell[1]);
        
      let cellOffset = cell / grid * 2;
      let gridPos = (pos + 1) / grid - 1 + cellOffset;

      return vec4f(gridPos, 0, 1);
    }

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
      return vec4f(1, 1, 1, 1);
    }
  `,
})

export const createSquareShader = () => ({
    label: 'Cell shader',
    code: /* wgsl */ `
    // Your shader code will go here
    @vertex
    fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
      // return vec4f(pos.x, pos.y, 0, 1); // (X, Y, Z, W)
      return vec4f(pos, 0, 1);
    }

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
      return vec4f(1, 0, 0, 1);
    }
  `,
})

export const createGridShader = () => ({
    label: 'Grid Cell shader',
    code: /* wgsl */ `    
    struct VertexOutput {
      @builtin(position) p: vec4f,
      @location(0) cell: vec2f,
    };

    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(1) var<storage> cellState: array<u32>;
  
    @vertex
    fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) instance: u32) 
      -> VertexOutput {
        
        let i = f32(instance); // Save the instance_index as a float
        
        // Compute the cell coordinate from the instance_index
        let cell = vec2f(i % grid.x, floor(i / grid.x));
        
        let state = f32(cellState[instance]);
        let cellOffset = cell / grid * 2;
        let gridPos = (pos * state + 1) / grid - 1 + cellOffset;

        var output: VertexOutput;
        output.p = vec4f(gridPos, 0, 1);
        // output.cell = cell / grid;
        output.cell = cell;
        return output;
    }

    struct FragInput {
      @builtin(position) p: vec4f,
      @location(0) cell: vec2f,
    };
    
    @fragment
    fn fragmentMain(input: FragInput) -> @location(0) vec4f {
      let c = input.cell / grid;
      return vec4f(c, 1.0 - (c.x + c.y), 1);
    }
    `,
})

export const createComputeShader = (WORKGROUP_SIZE = 8) => ({
    label: 'Game of Life simulation shader',
    code: /* wgsl */ `
    @group(0) @binding(0) var<uniform> grid: vec2f;

    @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
    @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

    fn cellActive(x: u32, y: u32) -> u32 {
      return cellStateIn[cellIndex(vec2(x, y))];
    }

    fn cellIndex(cell: vec2u) -> u32 {
      return (cell.y % u32(grid.y)) * u32(grid.x) +
             (cell.x % u32(grid.x));
    }

    @compute
    @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
      let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                            cellActive(cell.x+1, cell.y) +
                            cellActive(cell.x+1, cell.y-1) +
                            cellActive(cell.x, cell.y-1) +
                            cellActive(cell.x-1, cell.y-1) +
                            cellActive(cell.x-1, cell.y) +
                            cellActive(cell.x-1, cell.y+1) +
                            cellActive(cell.x, cell.y+1);
      let i = cellIndex(cell.xy);

      // Conway's game of life rules:
      switch activeNeighbors {
        case 2: { // Active cells with 2 neighbors stay active.
          cellStateOut[i] = cellStateIn[i];
        }
        case 3: { // Cells with 3 neighbors become or stay active.
          cellStateOut[i] = 1;
        }
        default: { // Cells with < 2 or > 3 neighbors become inactive.
          cellStateOut[i] = 0;
        }
      }
    }`,
})

export const createDefaultPolygonShader = () => ({
    label: 'pol default shader',
    code: /* wgsl */ `
    // Your shader code will go here
    @group(0) @binding(0) var<uniform> rgb: vec3f;

    @vertex
    fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
      // return vec4f(pos.x, pos.y, 0, 1); // (X, Y, Z, W)
      return vec4f(pos*0.9, 0, 1);
    }

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
      return vec4f(rgb, 1);
    }
  `,
})

export const createPolygonShader = () => ({
    label: 'pol shader',
    code: /* wgsl */ `
  // Your shader code will go here
  @group(0) @binding(1) var<storage> mousePosition: vec2f;

  @vertex
  fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
    // return vec4f(pos.x, pos.y, 0, 1); // (X, Y, Z, W)
    return vec4f((mousePosition + pos*0.1), 0, 1);
  }

  @fragment
  fn fragmentMain() -> @location(0) vec4f {
    return vec4f(1, mousePosition, 1);
  }
`,
})
