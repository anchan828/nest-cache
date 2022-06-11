import { Injectable } from "@nestjs/common";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter";

type CacheMessageEvents = {
  deleted: (keys: string[]) => void;
  delete: (keys: string[]) => void;
};

@Injectable()
export class CacheEventEmitter extends (EventEmitter as unknown as new () => TypedEmitter<CacheMessageEvents>) {}
