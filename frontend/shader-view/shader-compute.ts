import Wgl, { WglProgram, Uniform, FloatVecAttribute, FloatUniform } from 'wgl';
import FragShader from './store/frag-shader.ts';

const vertexShader = `
#version 100
precision mediump float;

attribute vec2 a_pos;
varying vec2 v_pos;
varying vec2 v_uv;

void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_pos = a_pos;
    v_uv = a_pos / 2.0 + vec2(0.5);
}
`;

export default class ShaderCompute {
    private compiledShader: string;
    private program: WglProgram;

    constructor(private shader: FragShader, private gl: Wgl) {
        this.compiledShader = shader.compile();
        this.program = gl.makeProgram(vertexShader, this.compiledShader);
    }

    public setShader(newShader: FragShader) {
        const compiledShader = newShader.compile();

        let program = this.gl.makeProgram(vertexShader, compiledShader);

        this.compiledShader = compiledShader;
        this.program.destroy();
        this.program = program;
    }

    public draw(uniforms: [string, Uniform][] = []) {
        const positions = [
            [-1.0, -1.0],
            [-1.0,  1.0],
            [1.0,  1.0],
            [1.0, -1.0],
            [-1.0, -1.0],
        ];

        this.gl.draw(this.program,
                     5,
                     [["a_pos", new FloatVecAttribute(positions)]],
                     uniforms
                    );
    }
}
