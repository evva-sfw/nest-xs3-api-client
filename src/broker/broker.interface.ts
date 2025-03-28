export interface Broker {
  isConnected(): boolean;
  handleCQRSEvent(payload: any): void;
  handleAccessProtocolEvent(payload: any): void;
  handleQueryResponseEvent(payload: any): void;
  publishQuery(payload: any): Promise<void>;
  publishPageQuery(payload: any): Promise<void>;
}
