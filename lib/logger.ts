
const tracer = require('tracer');


export type LogMethod = (...rest: any[]) => void;

export interface Tracer {
    log: LogMethod;
    trace: LogMethod;
    debug: LogMethod;
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
}

export class Logger implements Tracer {

    private tracer: Tracer;

    constructor(tracer: any) {
        let tr = this.tracer = tracer.colorConsole() as Tracer;
        this.log = tr.log.bind(tr);
        this.trace = tr.trace.bind(tr);
        this.debug = tr.debug.bind(tr);
        this.info = tr.info.bind(tr);
        this.warn = tr.warn.bind(tr);
        this.error = tr.error.bind(tr);
    }

    public log: LogMethod;
    public trace: LogMethod;
    public debug: LogMethod;
    public info: LogMethod;
    public warn: LogMethod;
    public error: LogMethod;

}

export const logger = new Logger(tracer);
