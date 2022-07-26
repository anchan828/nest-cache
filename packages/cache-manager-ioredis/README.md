# @anchan828/nest-cache-manager-ioredis

![npm](https://img.shields.io/npm/v/@anchan828/nest-cache-manager-ioredis.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-cache-manager-ioredis.svg)

## Description

Redis store for node-cache-manager using IORedis.

## Installation

```bash
$ npm i --save @anchan828/nest-cache-manager-ioredis
```

## Quick Start

```ts
import { redisStore } from "@anchan828/nest-cache-manager-ioredis";
import { caching } from "cache-manager";

caching({
  store: redisStore,
  host: "localhost",
});
```

## Use AsyncLocalStorage

You can cache results of redis to `AsyncLocalStorage<Map<string, any>>`.

```ts
const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

caching({
  store: redisStore,
  host: "localhost",
  asyncLocalStorage: asyncLocalStorage,
});


...


asyncLocalStorage.run(new Map(), ()=>{
  ...
})
```

## Notes

- This package uses MessagePack for efficient serialization/deserialization.
  - The most obvious is to serialize/deserialize a Date object with JSON. JSON.parse does not support Date object, so you need to implement the receiver yourself. Checking and parsing properties one by one as strings is an inefficient and very time-consuming process.

## License

[MIT](LICENSE)
