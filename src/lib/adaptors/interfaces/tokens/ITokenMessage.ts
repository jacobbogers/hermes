import { ITokenMessageBase } from './ITokenMessageBase';

export interface ITokenMessage extends ITokenMessageBase {
    templateName: string | null;
}
