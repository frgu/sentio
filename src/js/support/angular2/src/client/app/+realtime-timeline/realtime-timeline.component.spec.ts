import {
  beforeEachProviders,
  describe,
  ddescribe,
  expect,
  iit,
  it,
  inject,
  injectAsync,
  ComponentFixture,
  TestComponentBuilder
} from 'angular2/testing';
import {provide} from 'angular2/core';
import {RealtimeTimelineComponent} from './realtime-timeline.component';

describe('RealtimeTimeline Component', () => {

  beforeEachProviders((): any[] => []);


  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(RealtimeTimelineComponent).then((fixture: ComponentFixture) => {
      fixture.detectChanges();
    });
  }));

});
