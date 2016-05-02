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
import {VerticalBarsComponent} from './vertical-bars.component';

describe('VerticalBars Component', () => {

  beforeEachProviders((): any[] => []);


  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(VerticalBarsComponent).then((fixture: ComponentFixture) => {
      fixture.detectChanges();
    });
  }));

});
