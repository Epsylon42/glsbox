export default interface Attribute {
    setAttribute(gl: WebGLRenderingContext, location: number);
}

export class FloatVecAttribute implements Attribute {
    private value: number[];
    private step: number;

    constructor(value: number[][]) {
        this.step = 0;
        for (let vec of value) {
            if (this.step !== 0 && vec.length !== this.step) {
                throw new Error('All vectors must be the same length');
            }
            if (vec.length < 2 || vec.length > 4) {
                throw new Error('Vector size must be 2 to 4');
            }
            this.step = vec.length;
        }

        this.value = [];
        for (let i = 0; i < value.length; i++) {
            for (let j = 0; j < this.step; j++) {
                this.value.push(value[i][j]);
            }
        }
    }

    public setAttribute(gl: WebGLRenderingContext, location: number) {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.value), gl.STATIC_DRAW);
        gl.vertexAttribPointer(location, this.step, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }
}
