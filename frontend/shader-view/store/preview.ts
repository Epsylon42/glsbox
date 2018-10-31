export default class Preview {
    public deleted: boolean = false;

    constructor(
        public url?: string,
        public blob?: Blob,
    ) {}
}
