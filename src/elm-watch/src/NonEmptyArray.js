import * as Decode from "tiny-decoders";
export function NonEmptyArray(decoder) {
    return Decode.chain(Decode.array(decoder), (array) => {
        if (isNonEmptyArray(array)) {
            return array;
        }
        throw new Decode.DecoderError({
            message: "Expected a non-empty array",
            value: array,
        });
    });
}
export function isNonEmptyArray(array) {
    return array.length >= 1;
}
export function mapNonEmptyArray(array, f) {
    return array.map(f);
}
export function flattenNonEmptyArray(array) {
    return array.flat();
}
export function nonEmptyArrayUniqueBy(f, items) {
    const result = [items[0]];
    for (const item of items) {
        if (result.every((otherItem) => f(otherItem) !== f(item))) {
            result.push(item);
        }
    }
    return result;
}
