// Type definitions for express-session
// Project: https://www.npmjs.org/package/express-session
// Definitions by: Hiroki Horiuchi <https://github.com/horiuchi/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />
/// <reference types="express" />

declare namespace Express {

  export interface Request {
    session?: Session;
    sessionID?: string;
    sessionStore:any;
  }

  export interface SessionData {
    [key: string]: any;
    cookie: Express.SessionCookieData;
  }

  export interface SessionCookieData {
    originalMaxAge: number;
    path: string;
    maxAge: number;
    secure?: boolean;
    httpOnly: boolean;
    domain?: string;
    expires: Date | boolean;
  }

  export interface SessionCookie extends SessionCookieData {
    serialize: (name: string, value: string) => string;
  }

  export interface Session extends SessionData {
    id: string;
    req: Express.Request;

    regenerate: (callback: (err: any) => void) => void;
    destroy: (callback: (err: any) => void) => void;
    reload: (callback: (err: any) => void) => void;
    save: (callback: (err: any) => void) => void;
    touch: (callback: (err: any) => void) => void;

    cookie: SessionCookie;
  }



}

declare module 'express-session' {
  import express = require('express');
  import node = require('events');

  function session(options?: session.SessionOptions): express.RequestHandler;

  namespace session {
    export interface SessionOptions {
      secret: string;
      name?: string;
      store?: Store | MemoryStore;
      cookie?: express.CookieOptions;
      genid?: (req: express.Request) => string;
      rolling?: boolean;
      resave?: boolean;
      proxy?: boolean;
      saveUninitialized?: boolean;
      unset?: string;
    }

    export interface BaseMemoryStore {
      get: (sid: string, callback: (err: any, session: Express.Session) => void) => void;
      set: (sid: string, session: Express.Session, callback: (err: any) => void) => void;
      destroy: (sid: string, callback: (err: any) => void) => void;
      length?: (callback: (err: any, length: number) => void) => void;
      clear?: (callback: (err: any) => void) => void;
    }

    export abstract class Store extends node.EventEmitter {
      constructor(config?: any);

      regenerate(req: express.Request, fn: (err: any) => any): void;
      load(sid: string, fn: (err: any, session: Express.Session) => any): void;
      createSession(req: express.Request, sess: Express.SessionData): void;

      get(sid: string, callback: (err: any, session: Express.SessionData) => void): void;
      set(sid: string, session: Express.Session, callback: (err: any) => void): void;
      destroy(sid: string, callback: (err: any) => void): void;
      all(callback: (err: any, obj: { [sid: string]: Express.SessionData; }) => void): void;
      length(callback: (err: any, length: number) => void): void;
      clear(callback: (err: any) => void): void;
    }

    export class MemoryStore implements BaseMemoryStore {
      get(sid: string, callback: (err: any, session: Express.Session) => void): void;
      set(sid: string, session: Express.Session, callback: (err: any) => void): void;
      destroy(sid: string, callback: (err: any) => void): void;
      all(callback: (err: any, obj: { [sid: string]: Express.Session; }) => void): void;
      length(callback: (err: any, length: number) => void): void;
      clear(callback: (err: any) => void): void;
    }
  }

  export = session;
}

