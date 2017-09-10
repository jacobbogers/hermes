
import { GraphQLStatusCodes } from '~graphql/GraphQLStatusCodes';

export interface IUserInfo {
  name: string;
  email: string;
  state: GraphQLStatusCodes;
}
