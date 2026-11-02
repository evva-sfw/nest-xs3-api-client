import { MqttBrokerService } from '../broker/mqtt/mqtt-broker.service';
import { CommandService } from '../command/command.service';
import { QueryService } from '../query/query.service';
import { ClientConnectOptions } from './client-connect.options';
import { ClientService } from './client.service';
import { describe, expect, it, vi } from 'vitest';

describe('ClientService connection diagnostics', () => {
  function createClient(connectError: unknown) {
    const connect = vi.fn().mockRejectedValue(connectError);
    const broker = { connect } as unknown as MqttBrokerService;
    const client = new ClientService(
      broker,
      {} as QueryService,
      {} as CommandService,
    );
    const options = {
      host: 'broker.example.invalid',
      port: 8883,
      protocol: 'mqtts',
      clientId: 'maintainer',
      token: 'test-token',
      cert: Buffer.from('certificate'),
      key: Buffer.from('private key'),
    } as ClientConnectOptions;
    return { client, options };
  }

  it('exposes a safe system error code without retaining the error text', async () => {
    const { client, options } = createClient(
      Object.assign(new Error('sentinel-secret'), { code: 'ECONNREFUSED' }),
    );

    await expect(client.connect(options)).resolves.toBe(false);
    expect(client.getLastConnectErrorCode()).toBe('ECONNREFUSED');
    expect(client.getLastConnectErrorCode()).not.toContain('sentinel-secret');
  });

  it('exposes only a numeric MQTT reason code for broker rejections', async () => {
    const { client, options } = createClient(
      Object.assign(new Error('sentinel-secret'), { reasonCode: 5 }),
    );

    await client.connect(options);
    expect(client.getLastConnectErrorCode()).toBe('MQTT_REASON_5');
  });

  it('uses a generic safe code for unrecognized errors', async () => {
    const { client, options } = createClient(
      new Error('sentinel-secret-in-error-message'),
    );

    await client.connect(options);
    expect(client.getLastConnectErrorCode()).toBe('CONNECTION_ERROR');
  });
});
