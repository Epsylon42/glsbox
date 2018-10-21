import { TextureKind } from '../common/texture-kind.ts';

export default class TextureData {
    constructor(
        public src: string,
        public name: string,
        public kind: TextureKind = TextureKind.Normal
    ) {}

    public image: HTMLImageElement | null = null;
    public file?: File = null;
    public id?: number = null;
}
