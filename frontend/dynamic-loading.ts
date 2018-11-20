function defaultModify<T>(dl: DynamicLoading<T>, func: (dl: DynamicLoading<T>) => void) {
    func(dl);
}

export default class DynamicLoading<T> {
    public shown: T[] = [];
    public nextBatch: T[] = [];
    public canLoadMore: boolean = true;

    public page: number = 1;

    public loadingLock: boolean = false;
    public firstLoading: boolean = false;

    constructor(
        public limit: number
    ) {}

    public reset() {
        this.shown = [];
        this.nextBatch = [];
        this.canLoadMore = true;
        this.page = 1;
    }

    public pushBatch(batch: T[]) {
        if (batch.length === 0) {
            this.canLoadMore = false;
        }

        if (this.shown.length === 0) {
            this.shown = batch;
        } else {
            this.shown.splice(this.shown.length, 0, ...this.nextBatch);
            this.nextBatch = batch;
        }

        this.page += 1;
    }

    public load(
        load: (limit: number, page: number) => Promise<T[]>,
        modify: (dl: DynamicLoading<T>, func: (dl: DynamicLoading<T>) => any) => any = defaultModify
    ): Promise<void> {

        if (this.loadingLock) {
            return Promise.reject(new Error("Some data is already loading"));
        }

        modify(this, dl => dl.loadingLock = true);

        const firstTime = this.shown.length === 0;
        if (firstTime) {
            modify(this, dl => dl.firstLoading = true);
        }

        const promise = load(this.limit, this.page)
            .then(items => {
                modify(this, dl => dl.pushBatch(items));

                if (firstTime && items.length === this.limit) {
                    return load(this.limit, this.page);
                } else if (firstTime || items.length === 0) {
                    modify(this, dl => dl.canLoadMore = false);
                }
            })
            .then(maybeItems => {
                if (maybeItems) {
                    modify(this, dl => dl.pushBatch(maybeItems));
                }
            });

        const unlock = () => {
            modify(this, dl => {
                dl.loadingLock = false;
                dl.firstLoading = false;
            });
        };

        promise
            .then(unlock)
            .catch(unlock);

        return promise;
    }
}
