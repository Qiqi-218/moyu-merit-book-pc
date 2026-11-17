export function fnv1a32(input: string): number {
    let hash = 0x811c9dc5
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
}

export function stableIndex(input: string, size: number): number {
    if (size <= 0) return 0
    return fnv1a32(input) % size
}