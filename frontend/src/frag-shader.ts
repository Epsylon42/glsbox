export default class FragShader {
    private libs: FragShader[] = [];

    constructor(public source: string, public declarations: string[] = []) {}

    public compile(): string {
        let compiled = "";
        compiled += `
#version 100
precision mediump float;
`;

        for (let decl of this.declarations) {
            compiled += decl + "\n";
        }

        compiled += this.source;

        return compiled;
    }
}
