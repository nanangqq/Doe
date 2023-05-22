export const defaultShader = (color) => {
  const vertex = `
        @vertex
        fn main(@builtin(vertex_index) VertexIndex: u32) -> @builtin(position) vec4<f32> {
            var pos = array<vec2<f32>, 3>(
                vec2<f32>(0.0, 0.5),
                vec2<f32>(-0.5, -0.5),
                vec2<f32>(0.5, -0.5));
            return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
        }
    `

  const fragment = `
        @fragment
        fn main() -> @location(0) vec4<f32> {
            return vec4<f32>${color};
        }
    `
  return { vertex, fragment }
}

export const createSquareShader = () => ({
  label: 'Cell shader',
  code: `
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
  code: `
    @group(0) @binding(0) var<uniform> grid: vec2f;

    @vertex
    fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) instance: u32) ->
      @builtin(position) vec4f {
      
        // Add 1 to the position before dividing by the grid size.
        // let gridPos = (pos + 1) / grid;
        // let gridPos = (pos + 1) / grid - 1;

        let i = f32(instance); // Save the instance_index as a float
        
        // Compute the cell coordinate from the instance_index
        let cell = vec2f(i % grid.x, floor(i / grid.x));
        
        let cellOffset = cell / grid * 2; // Compute the offset to cell
        let gridPos = (pos + 1) / grid - 1 + cellOffset; // Add it here!

        return vec4f(gridPos, 0, 1);
    }

    // @vertex
    // fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
    //   // return vec4f(pos.x, pos.y, 0, 1); // (X, Y, Z, W)
    //   return vec4f(pos, 0, 1);
    // }

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
      return vec4f(1, 0, 0, 1);
    }
  `,
})
