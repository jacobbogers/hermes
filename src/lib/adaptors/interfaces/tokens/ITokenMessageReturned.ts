import { ITokenMessageBase } from './ITokenMessageBase';

export interface ITokenMessageReturned extends ITokenMessageBase {
  templateId: number | null;
}
