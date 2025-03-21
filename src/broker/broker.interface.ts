export interface Broker {
  handleCQRSEvent(payload: any): void;
  handleAccessProtocolEvent(payload: any): void;
  handleUserEvent(payload: any): void;
  publishQuery(payload: any): Promise<void>;
  publishPageQuery(payload: any): Promise<void>;
}
