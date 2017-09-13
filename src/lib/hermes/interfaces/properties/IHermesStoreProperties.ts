import { AdaptorBase } from '~adaptors/AdaptorBase';

export interface IHermesStoreProperties {
  adaptor: AdaptorBase; // Assign to with subclass of new AdaptorBase(...)
  defaultCookieOptionsName?: string;
}
