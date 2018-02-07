export interface User {
    id: string;
    name: string;
    email: string;
    lastUpdated: string;
    created: string; 
}

export interface UserProp {
    userId: string;
    propName: string;
    propValue: string;
    invisible: boolean;
    lastUpdated: string;
    created: string;
}

export interface Template {
    name: string;
    path: string;
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    domain: string;
    sameSite: boolean;
    rolling: boolean;
    lastUpdated: string;
    created: string;
}

export interface Token {
  id: string;
  userId: string;
  purpose: string;
  ip: string;
  revoked: string;
  revokeReason: string;
  expire: string;
  template: string; 
  lastUpdated: string;
  created: string;
}

export interface TokenProp {
    tokenId: string;
    propName: string;
    propValue: string;
    invisible: boolean;
    lastUpdated: string;
    created: string;
}
