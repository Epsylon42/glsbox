export default class Preview {
    public save: boolean = false;

    constructor(
        public url?: string,
        public blob?: Blob,
    ) {}
}
