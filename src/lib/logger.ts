'use strict';

const _tracer = require('tracer');


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

    private static tracer: Tracer = null as any;

    private constructor(tracer?: any) {
        let tr = Logger.tracer = tracer || _tracer.colorConsole() as Tracer;
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

    public static getLogger(logger?: Tracer) {
        if (Logger.tracer) {
            return Logger.tracer;
        }
        return new Logger(logger);
    }
}

export default Logger ;
