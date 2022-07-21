export function patchMoreCommands(self: any): void {
  if (!self.store) {
    return;
  }

  const storeName = typeof self.store === "string" ? self.store : self.store.name;

  if (typeof self.store.hget === "function") {
    self.hget = self.store.hget.bind(self.store);
  } else {
    printWarning(storeName, "hget");
    self.hget = () => Promise.resolve();
  }

  if (typeof self.store.hset === "function") {
    self.hset = self.store.hset.bind(self.store);
  } else {
    printWarning(storeName, "hset");
    self.hset = () => Promise.resolve();
  }

  if (typeof self.store.hdel === "function") {
    self.hdel = self.store.hdel.bind(self.store);
  } else {
    printWarning(storeName, "hdel");
    self.hdel = () => Promise.resolve();
  }

  if (typeof self.store.hgetall === "function") {
    self.hgetall = self.store.hgetall.bind(self.store);
  } else {
    printWarning(storeName, "hgetall");
    self.hgetall = () => Promise.resolve();
  }

  if (typeof self.store.hkeys === "function") {
    self.hkeys = self.store.hkeys.bind(self.store);
  } else {
    printWarning(storeName, "hkeys");
    self.hkeys = () => Promise.resolve();
  }
}

function printWarning(storeName: string, commandName: string): void {
  console.warn(
    `This store '${storeName}' does not support ${commandName}. Note that calling it will not work correctly.`,
  );
}
