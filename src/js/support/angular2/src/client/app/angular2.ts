import {Component, Output, EventEmitter, ViewEncapsulation} from 'angular2/core';
import {RouteConfig, ROUTER_DIRECTIVES, ROUTER_PROVIDERS} from 'angular2/router';
import {VerticalBarsComponent} from './+vertical-bars/vertical-bars.component';
import {VerticalBarChart} from './vertical-bar-chart/vertical-bar-chart.directive';
import {EventEmitterService} from './event-emitter-service.service';
@Component({
  moduleId: __moduleName,
  selector: 'angular2-app',
  providers: [ROUTER_PROVIDERS, EventEmitterService],
  templateUrl: 'angular2.html',
  styleUrls: ['angular2.css', '../../../css/sentio.css'],
  directives: [ROUTER_DIRECTIVES, VerticalBarChart],
  pipes: [],
  encapsulation: ViewEncapsulation.None
})
@RouteConfig([
  {path: '/verticalBars', name: 'VerticalBars', component: VerticalBarsComponent},
])
export class Angular2App {
  defaultMeaning: number = 42;
  connection: VerticalBarChart;
  meaningOfLife(meaning?: number) {
    return `The meaning of life is ${meaning || this.defaultMeaning}`;
  }
  updateData(){
    EventEmitterService.get('updateData').emit('click');
  }
}
