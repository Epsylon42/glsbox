export const uniforms = [
    "varying vec2 v_pos;",
    "varying vec2 v_uv;",
    "uniform float u_time;",
    "uniform vec2 u_resolution;",
];

export default class FragShader {
    private libs: FragShader[] = [];

    constructor(public source: string, public textures: string[] = []) {}

    public compile(): string {
        let compiled = "";
        compiled += `
#version 100
precision mediump float;
`;

        for (let decl of uniforms) {
            compiled += decl + "\n";
        }
        for (let decl of this.textures) {
            compiled += decl + "\n";
        }

        compiled += this.source;

        return compiled;
    }
}
