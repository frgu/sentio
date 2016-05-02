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
import {VerticalBarChart} from './vertical-bar-chart.directive';


@Component({
  selector: 'test-component',
  template: `<div vertical-bar-chart></div>`
})
class TestComponent {}

describe('VerticalBarChart Directive', () => {

  beforeEachProviders((): any[] => []);


  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(TestComponent).then((fixture: ComponentFixture) => {
      fixture.detectChanges();
    });
  }));

});
