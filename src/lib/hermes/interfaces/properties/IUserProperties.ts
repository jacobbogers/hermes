import { IUserMessageReturned } from '~users/IUserMessageReturned';

export interface IUserProperties extends IUserMessageReturned {
    userProps: {
        [name: string]: string;
    };
}
