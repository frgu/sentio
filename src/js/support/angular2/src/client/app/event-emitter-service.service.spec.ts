import {
  beforeEachProviders,
  it,
  iit,
  describe,
  ddescribe,
  expect,
  inject,
  injectAsync
} from 'angular2/testing';
import {provide} from 'angular2/core';
import {EventEmitterService} from './event-emitter-service.service';


describe('EventEmitterService Service', () => {

  beforeEachProviders(() => [EventEmitterService]);
  
  it('should ...', inject([EventEmitterService], (service: EventEmitterService) => {

  }));

});
