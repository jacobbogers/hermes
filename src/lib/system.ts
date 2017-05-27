
import { EventEmitter } from 'events';
import { staticCast } from './utils';

let _system: SystemInfo;

export interface SystemInfoOptions {
    maxErrors: number;
    maxWarnings: number;
}

export class SystemInfo extends EventEmitter {

    private _maxErr: number;
    private _maxWarn: number;

    private errors: any[] = [];
    private warnings: any[] = [];


    private get maxErr(): number {
        return this._maxErr;
    }

    private set maxErr(v: number) {
        this._maxErr = v;
        this.errors.splice(0, Math.max(this.errors.length - v, 0));
    }

    private get maxWarn(): number {
        return this._maxWarn;
    }

    private set maxWarn(v: number) {
        this._maxWarn = v;
        this.warnings.splice(0, Math.max(this.warnings.length - v, 0));
    }


    private constructor(p: SystemInfoOptions) {
        super();
        this.maxErr = p.maxErrors;
        this.maxWarn = p.maxWarnings;
    }

    public static createSystemInfo(opts?: Partial<SystemInfoOptions>): SystemInfo {
        if (!opts && !_system) {
            throw new Error('SystemInfo object is not yet created, need to specify "options:SystemInfoProperties" this time.');
        }
        if (_system && !opts) {
            return _system;
        }

        if (opts) {
            opts.maxErrors = opts.maxErrors || 100;
            opts.maxWarnings = opts.maxWarnings || 100;

            let _opts = staticCast<SystemInfoOptions>(opts);

            if (_system) {
                _system.maxErr = opts.maxErrors;
                _system.maxWarn = opts.maxWarnings;
                return _system;
            }
            _system = new SystemInfo(_opts);

        }
        return _system;
        //unreachable code
    }

    public systemErrors<T>(limit: number | null, constructor: new (...args: any[]) => T): T[] {
        let rc: T[] = this.errors.filter((err) => { return ((err as any) instanceof constructor); }).slice(-(limit || 0)) as any;
        return rc;
    }

    public systemWarnings<T>(limit: number | null, constructor: new (...args: any[]) => T): T[] {
        let rc: T[] = this.warnings.filter((warn) => { return ((warn as any) instanceof constructor); }).slice(-(limit || 0)) as any;
        return rc;
    }

    public addError<T>(itm: T): number {
        this.errors.push(itm);
        this.errors.splice(0, Math.max(0, this.errors.length - this.maxErr));
        if (this.listenerCount('error') > 0) {
            this.emit('error', itm);
        }
        return this.errors.length;
    }

    public addWarning<T>(itm: T): number {
        this.warnings.push(itm);
        this.warnings.splice(0, Math.max(0, this.warnings.length - this.maxWarn));
        this.emit('warning', itm);
        return this.warnings.length;
    }

    public lastErr<T>(constructor: new (...args: any[]) => T): any {
        return this.systemErrors(1, constructor)[0];
    }

    public lastWarnErr<T>(constructor: new (...args: any[]) => T): any {
        return this.systemWarnings(-1, constructor)[0];
    }

    public clearErr(): void {
        this.errors.splice(0);
    }

    public clearWarnings(): void {
        this.warnings.splice(0);
    }

    public hasErrors<T>(constructor: new (...args: any[]) => T): boolean {
        for (let err of this.errors) {
            if ((err.prototype || {}).name === constructor.name) {
                return true;
            }
        }
        return false;
    }

}
