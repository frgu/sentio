import {Injectable, EventEmitter} from 'angular2/core';

@Injectable()
export class EventEmitterService {

  private static _emitters: { [channel: string]: EventEmitter<any> } = {};
  static get(channel: string): EventEmitter<any> {
    if (!this._emitters[channel])
      this._emitters[channel] = new EventEmitter();
    return this._emitters[channel];
  }

}
