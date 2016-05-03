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
import {provide, Component} from 'angular2/core';
import {TimelineLine} from './timeline-line.directive';


@Component({
  selector: 'test-component',
  template: `<div timeline-line></div>`
})
class TestComponent {}

describe('TimelineLine Directive', () => {

  beforeEachProviders((): any[] => []);


  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(TestComponent).then((fixture: ComponentFixture) => {
      fixture.detectChanges();
    });
  }));

});
