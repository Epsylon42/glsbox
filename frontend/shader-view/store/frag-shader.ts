import { TextureKind } from '../../../common/texture-kind.ts';
import TextureData from './texture-data.ts';

export class Declaration {
    constructor(
        public kind: "varying" | "uniform",
        public type: string,
        public name: string,
        public description?: string,
    ) {}

    public toString(): string {
        return [this.kind, this.type, this.name].join(" ") + ";";
    }
}

export const declarations = [
    new Declaration("varying", "vec2", "v_pos"),
    new Declaration("varying", "vec2", "v_uv"),
    new Declaration("uniform", "float", "u_time"),
    new Declaration("uniform", "vec2", "u_resolution"),
];

export default class FragShader {
    private libs: FragShader[] = [];

    constructor(public source: string, public textures: Declaration[] = []) {}

    constructTextures(textures: TextureData[] = []) {
        this.textures = textures
            .map(tex => new Declaration(
                "uniform",
                tex.kind === TextureKind.Cubemap ?
                    "samplerCube" :
                    "sampler2D",
                "tex_" + tex.name
            ));
    }

    public compile(): string {
        let compiled = "";
        compiled += `
#version 100
precision mediump float;
`;

        compiled += declarations
            .concat(this.textures)
            .map(decl => decl.toString())
            .join("\n") + "\n";

        compiled += this.source;

        return compiled;
    }
}
