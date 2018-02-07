import * as util from 'util';
import { GraphQLStatusCodes } from './GraphQLStatusCodes';

export class AuthenticationError {
  private context: GraphQLStatusCodes;
  private message: string;

  public constructor(context: GraphQLStatusCodes, message: string) {
    this.context = context;
    this.message = message;
  }

  public toString(): string {
    return util.format('%s, %s', this.context || '', this.message);
  }
  public value(): [GraphQLStatusCodes, string] {
    return [this.context, this.message];
  }
}
