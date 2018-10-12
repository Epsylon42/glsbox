export default class FragShader {
    private libs: FragShader[] = [];

    constructor(public source: string, public uniforms: string[] = [], public textures: string[] = []) {}

    public compile(): string {
        let compiled = "";
        compiled += `
#version 100
precision mediump float;
`;

        for (let decl of this.uniforms) {
            compiled += decl + "\n";
        }
        for (let decl of this.textures) {
            compiled += decl + "\n";
        }

        compiled += this.source;

        return compiled;
    }
}
