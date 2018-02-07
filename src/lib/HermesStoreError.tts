export class HermesStoreError extends Error {
  private _connected: boolean;

  public constructor(message: string, connected: boolean) {
    super(message);
    this.message = message;
    this.name = 'HermesStoreError';
    this._connected = connected;
  }

  public toString(): string {
    return `HermesStoreError: state:${this._connected ? '' : 'NOT'} connected`;
  }
}
