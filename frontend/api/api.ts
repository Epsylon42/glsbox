export default function checkError(obj: any): any {
    if (obj.error) {
        throw new Error(obj.message);
    } else {
        return obj;
    }
}
