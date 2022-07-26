# @anchan828/nest-cache-manager-memory

![npm](https://img.shields.io/npm/v/@anchan828/nest-cache-manager-memory.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-cache-manager-memory.svg)

## Description

Memory store for node-cache-manager. This store adds a function compatible with Redis hash commands. However, do not expect performance.

## Installation

```bash
$ npm i --save @anchan828/nest-cache-manager-memory
```

## Quick Start

```ts
import { memoryStore } from "@anchan828/nest-cache-manager-memory";
import { caching } from "cache-manager";

caching({
  store: memoryStore,
});
```

## License

[MIT](LICENSE)
