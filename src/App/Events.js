import fbemitter from 'fbemitter';

const emitter = new fbemitter.EventEmitter();

export default class Events {

  static subscribe = emitter.addListener.bind(emitter);
  static emit = emitter.emit.bind(emitter);
}
