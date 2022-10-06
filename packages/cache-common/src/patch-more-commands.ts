export function patchMoreCommands(cacheManager: any): void {
  if (!cacheManager.store) {
    return;
  }
  patchCommands(cacheManager, [
    "get",
    "set",
    "del",
    "ttl",
    "keys",
    "mget",
    "mset",
    "mdel",
    "hget",
    "hset",
    "hdel",
    "hgetall",
    "hkeys",
  ]);
}

function patchCommands(self: any, commands: string[]): void {
  for (const command of commands) {
    if (typeof self.store[command] === "function") {
      self[command] = self.store[command].bind(self.store);
    } else {
      self[command] = () => Promise.resolve();
    }
  }
}
