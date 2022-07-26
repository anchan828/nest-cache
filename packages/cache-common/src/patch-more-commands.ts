export function patchMoreCommands(cacheManager: any): void {
  if (!cacheManager.store) {
    return;
  }
  patchCommands(cacheManager, ["hget", "hset", "hdel", "hgetall", "hkeys"]);
}

function patchCommands(self: any, commands: string[]): void {
  for (const command of commands) {
    if (typeof self.store[command] === "function") {
      self[command] = self.store[command].bind(self.store);
    } else {
      const storeName = typeof self.store === "string" ? self.store : self.store.name;
      console.warn(
        `This store '${storeName}' does not support ${command}. Note that calling it will not work correctly.`,
      );
      self[command] = () => Promise.resolve();
    }
  }
}
