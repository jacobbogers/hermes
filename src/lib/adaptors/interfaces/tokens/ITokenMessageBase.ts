
export interface ITokenMessageBase {
    tokenId: string;
    fkUserId: number | null;
    purpose: string;
    ipAddr: string | null;
    tsIssuance: number;
    tsRevoked: number | null;
    revokeReason: string | null;
    tsExpire: number;
    tsExpireCache: number;
}
