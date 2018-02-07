export declare function flatMap<T, F extends {
    obj: T;
}, Mc extends Map<T[keyof T], Mc | F>>(map: Mc): F[];
