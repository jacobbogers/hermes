import { ITokenMessage } from './ITokenMessage';

export interface ITokensAndPropsMessage extends ITokenMessage {
    // Overrides
    tokenId: string;
    fkUserId: number;
    tsIssuance: number;
    tsExpire: number;
    // Extras
    usrName: string;
    usrEmail: string;
    blackListed: boolean; // Its a repeat but ok
    tsRevoked: number | null;
    revokeReason: string | null;
    sessionPropName: string | null;
    sessionPropValue: string | null;
    propName: string | null;
    propValue: string | null;
}
