import { ITokenMessage } from '~tokens';

export interface ITokenProperties extends ITokenMessage {
  sessionProps: {
    [name: string]: string;
  };
}
