# @anchan828/nest-cache-manager-async-local-storage

![npm](https://img.shields.io/npm/v/@anchan828/nest-cache-manager-async-local-storage.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-cache-manager-async-local-storage.svg)

## Description

AsyncLocalStorage store for node-cache-manager.

## Installation

```bash
$ npm i --save @anchan828/nest-cache-manager-async-local-storage
```

## Quick Start

```ts
import { asyncLocalStorageStore } from "@anchan828/nest-cache-manager-async-local-storage";
import { caching } from "cache-manager";

caching({
  store: asyncLocalStorageStore,
  asyncLocalStorage: new AsyncLocalStorage<Map<string, any>>(),
});
```

## Notes

- This package is a cache function that is enabled only during a request using AsyncLocalStorage.
  - It is useful when the same data is retrieved from the database many times during a request, although it does not need to be cached permanently, such as in memory or Redis.

## License

[MIT](LICENSE)
