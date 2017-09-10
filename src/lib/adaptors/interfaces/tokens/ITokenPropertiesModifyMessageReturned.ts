import { IPropertiesModifyMessage } from '~properties/IPropertiesModifyMessage';

export interface ITokenPropertiesModifyMessageReturned
  extends IPropertiesModifyMessage {
  fkTokenId: string;
}
