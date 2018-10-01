class Clipper {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext("2d");
    }

    public clip(image: HTMLImageElement, sx: number, sy: number, wx: number, wy: number): string {
        this.canvas.width = image.width;
        this.canvas.height = image.height;
        this.ctx.drawImage(image, 0, 0);

        const data = this.ctx.getImageData(sx, sy, wx, wy);
        this.canvas.width = wx;
        this.canvas.height = wy;
        this.ctx.putImageData(data, 0, 0);

        const url = this.canvas.toDataURL();

        const img = new Image();
        img.src = url;

        return url;
    }

    public destroy() {
        this.canvas.remove();
    }
}

export class CubemapPromise {
    constructor(private parts: HTMLImageElement[], private resolved: () => boolean) {}

    public tryGetParts(): HTMLImageElement[] | null {
        if (this.resolved()) {
            return this.parts;
        } else {
            return null;
        }
    }
}

export default function sliceCubemap(image: HTMLImageElement): CubemapPromise {
    const width = image.width / 4;
    const height = image.height / 3;

    const start_positions: [number, number][] = [
        [width*2, height],
        [0, height],
        [width, 0],
        [width, height*2],
        [width, height],
        [width*3, height],
    ];

    const clipper = new Clipper();

    let resolved = false;
    let parts: HTMLImageElement[] = [];

    let ret = new CubemapPromise(parts, () => resolved);

    for (let i = 0; i < 6; i++) {
        const [x, y] = start_positions[i];

        const url = clipper.clip(image, x, y, width, height);
        const part = new Image(width, height);
        part.onload = () => {
            URL.revokeObjectURL(url);
            parts.push(part);
            if (parts.length === 6) {
                resolved = true;
            }
        };
        part.src = url;
    }

    clipper.destroy();

    return ret;
}
