export * from './uniforms.ts';
export { default as Uniform } from './uniforms.ts';
export * from './attributes.ts';
export { default as Attribute } from './attributes.ts';

import Uniform, { UniformContext } from './uniforms.ts';
import Attribute from './attributes.ts';
import TextureStorage from './texture_storage.ts';

export interface IWglError {
    kind: string;
    message: string;
}

export interface ShaderCompileError extends IWglError {
    kind: 'shader compile error';
    message: string;
}

export interface ProgramLinkError extends IWglError {
    kind: 'program link error';
    message: string;
}

export class WglError implements IWglError {
    public static shaderCompileError(message: string): WglError {
        return new WglError('shader compile error', message);
    }

    public isShadecCompileError(): this is ShaderCompileError {
        return this.kind === 'shader compile error';
    }

    public static programLinkError(message: string): WglError {
        return new WglError('program link error', message);
    }

    public isProgramLinkError(): this is ProgramLinkError {
        return this.kind === 'program link error';
    }

    constructor(public kind: string, public message: string) {}
}

export class WglProgram {
    constructor(private gl: WebGLRenderingContext, public inner: WebGLProgram) {}

    public destroy() {
        this.gl.deleteProgram(this.inner);
    }
}

export default class Wgl {
    private textures: TextureStorage;


    constructor(private gl: WebGLRenderingContext) {
        this.textures = new TextureStorage(gl);
    }

    private compileShader(shaderType: number, source: string): WebGLShader {
        const shader = this.gl.createShader(shaderType);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const err = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw WglError.shaderCompileError(err);
        }

        return shader;
    }

    public makeProgram(vertexSource: string, fragmentSource: string): WglProgram {
        const vertex = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragment = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        const prog = this.gl.createProgram();
        this.gl.attachShader(prog, vertex);
        this.gl.attachShader(prog, fragment);
        this.gl.linkProgram(prog);

        if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
            throw WglError.programLinkError(this.gl.getProgramInfoLog(prog));
        }

        return new WglProgram(this.gl, prog);
    }

    public draw(prog: WglProgram, vertices: number, attributes: [string, Attribute][], uniforms: [string, Uniform][]) {
        this.gl.useProgram(prog.inner);
        this.textures.step();

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        for (let [name, attr] of attributes) {
            const location = this.gl.getAttribLocation(prog.inner, name);
            attr.setAttribute(this.gl, location);
        }

        const ctx = new UniformContext(this.textures);
        for (let [name, uni] of uniforms) {
            const location = this.gl.getUniformLocation(prog.inner, name);
            uni.setUniform(this.gl, location, ctx);
        }

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, vertices);
    }
}
