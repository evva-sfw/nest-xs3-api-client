<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Nest XS3 Api Client

[![NPM Version](https://img.shields.io/npm/v/%40evva%2Fnest-xs3-api-client)](https://www.npmjs.com/package/@evva/nest-xs3-api-client)
[![NPM Downloads](https://img.shields.io/npm/dy/%40evva%2Fnest-xs3-api-client)](https://www.npmjs.com/package/@evva/nest-xs3-api-client)
![NPM Unpacked Size (with version)](https://img.shields.io/npm/unpacked-size/%40evva%2Fnest-xs3-api-client/latest)
![GitHub last commit](https://img.shields.io/github/last-commit/evva-sfw/nest-xs3-api-client)
[![GitHub branch check runs](https://img.shields.io/github/check-runs/evva-sfw/nest-xs3-api-client/main)]([URL](https://github.com/evva-sfw/nest-xs3-api-client/actions))
[![EVVA License](https://img.shields.io/badge/license-EVVA_License-yellow.svg?color=fce500&logo=data:image/svg+xml;base64,PCEtLSBHZW5lcmF0ZWQgYnkgSWNvTW9vbi5pbyAtLT4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjY0MCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgNjQwIDEwMjQiPgo8ZyBpZD0iaWNvbW9vbi1pZ25vcmUiPgo8L2c+CjxwYXRoIGZpbGw9IiNmY2U1MDAiIGQ9Ik02MjIuNDIzIDUxMS40NDhsLTMzMS43NDYtNDY0LjU1MmgtMjg4LjE1N2wzMjkuODI1IDQ2NC41NTItMzI5LjgyNSA0NjYuNjY0aDI3NS42MTJ6Ij48L3BhdGg+Cjwvc3ZnPgo=)](LICENSE)

## Install

```sh
$ npm i @evva/nest-xs3-api-client
```

## Description

Client implementation for the Xesar 3 MQTT api interface.

## Build & Package
```bash
# Nest Build
$ nest build
```

## Usage

### Import module

```ts
import { ClientService } from '@evva/nest-xs3-api-client';

@Module({
  imports: [
    ClientModule.forRootAsync({
      imports: [],
      inject: [],
      useFactory: () => {
        const cert = fs.readFileSync('conf/cert.pem', 'utf-8');
        const certCA = fs.readFileSync('conf/cert_ca.pem', 'utf-8');
        const key = fs.readFileSync('conf/pk.pem', 'utf-8');

        return {
          host: '127.0.0.1',
          port: 1883,
          cert: cert,
          certCA: certCA,
          key: key,
          clientId: 'clientId',
          token: 'token',
        };
      },
    }),
  ],
  providers: [AppService],
})
export class AppModule {}
```
### Query results

Query specific resources from the Xesar API with support for pagination and filters. 

```typescript
import { ClientService } from '@evva/nest-xs3-api-client';

@Injectable()
export class AppService {
  constructor(private readonly clientService: ClientService) {}

  async queryComponents() {
    let result = await this.clientService.queryPaged({
      res: 'evva-components',
      limit: 5,
      offset: 0,
      filters: [
        {
          type: 'eq',
          field: 'status',
          value: 'Synced',
        },
      ],
    });
  }
}
```

> You can auto-paginate all results by omitting the `limit` and `offset` properties.

A few of the supported resources are:

```typescript
export type Resource =
  | 'identification-media'
  | 'authorization-profiles'
  | 'access-protocol'
  | 'persons'
  | 'installation-points'
  | 'evva-components'
  | 'office-modes'
  | 'time-profiles'
  | 'zones';
```

### Execute commands

Execute specific CQRS commands on the Xesar API.

```typescript
import { ClientService } from '@evva/nest-xs3-api-client';

@Injectable()
export class AppService {
  constructor(private readonly clientService: ClientService) {}

  async remoteDisengage() {
    let result = await this.clientService.remoteDisengageCommand(
      'a034bfda-c569-49a0-a3ba-d438d65eeb34',
      false,
    );
  }
}
```

## License

Proprietary
