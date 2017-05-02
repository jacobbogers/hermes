

export class User {
    private _name: string;
    private _email: string;
    private _id: number;
    constructor(name: string, email: string) {
        this._name = name;
        this._email = email;
    }
    public get name() {
        return this._name;
    }
    public get email() {
        return this._email;
    }
    public get id() {
        return this._id;
    }
    public set id(pk: number) {
        this._id = pk;
    }
} 
