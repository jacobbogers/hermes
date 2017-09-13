import { IPropertiesModifyMessage } from '~properties/IPropertiesModifyMessage';

export interface IUserPropertiesModifyMessageReturned
  extends IPropertiesModifyMessage {
  fkUserId: number;
}
