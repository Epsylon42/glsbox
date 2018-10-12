import TextureStorage from './texture_storage.ts';

export default interface Uniform {
    setUniform(gl: WebGLRenderingContext, location: WebGLUniformLocation, ctx: UniformContext): void;
}

export class UniformContext {
    private _textureNumber: number = 0;

    get textureNumber(): number {
        return this._textureNumber;
    }

    constructor(public textures: TextureStorage) {}

    public nextTexture() {
        this._textureNumber += 1;
    }
}

export class FloatUniform implements Uniform {
    constructor(private value: number) {}

    public setUniform(gl: WebGLRenderingContext, location: WebGLUniformLocation) {
        gl.uniform1f(location, this.value);
    }
}

export class FloatVecUniform implements Uniform {
    private value: number[];

    constructor(value: number[]) {
        if (value.length < 2 || value.length > 4) {
            throw new Error('Vector size must be 2 to 4');
        }

        this.value = value.slice();
    }

    public setUniform(gl: WebGLRenderingContext, location: WebGLUniformLocation) {
        switch (this.value.length) {
        case 2:
            gl.uniform2fv(location, this.value);
            break;

        case 3:
            gl.uniform3fv(location, this.value);
            break;

        case 4:
            gl.uniform4fv(location, this.value);
            break;

        default:
            throw new Error('Unreachable code');
        }
    }
}

export class Texture2DUniform implements Uniform {
    constructor(private value: HTMLImageElement, private flip: boolean = false) {}

    public setUniform(gl: WebGLRenderingContext, location: WebGLUniformLocation, ctx: UniformContext) {
        const texture = ctx.textures.get(this.value, "2d");

        gl.activeTexture(gl['TEXTURE' + ctx.textureNumber]);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(location, ctx.textureNumber);

        ctx.nextTexture();
    }
}

export class TextureCubeUniform implements Uniform {
    constructor(private value: HTMLImageElement) {}

    public setUniform(gl: WebGLRenderingContext, location: WebGLUniformLocation, ctx: UniformContext) {
        const texture = ctx.textures.get(this.value, "cubemap");

        gl.activeTexture(gl['TEXTURE' + ctx.textureNumber]);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.uniform1i(location, ctx.textureNumber);

        ctx.nextTexture();
    }
}
