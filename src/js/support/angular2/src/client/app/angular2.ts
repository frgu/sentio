import {Component, Output, EventEmitter, ViewEncapsulation} from 'angular2/core';
import {RouteConfig, ROUTER_DIRECTIVES, ROUTER_PROVIDERS} from 'angular2/router';
import {VerticalBarChart, DonutChart, MatrixChart, RealtimeTimeline,TimelineLine} from './directives/index';
import {EventEmitterService} from './services/event-emitter-service.service';
import {RealtimeTimelineComponent} from './+realtime-timeline';
import {TimelineLineComponent} from './+timeline-line';
@Component({
  moduleId: __moduleName,
  selector: 'angular2-app',
  providers: [ROUTER_PROVIDERS, EventEmitterService],
  templateUrl: 'angular2.html',
  styleUrls: ['angular2.css', '../../../css/sentio.css'],
  directives: [ROUTER_DIRECTIVES, VerticalBarChart, DonutChart, MatrixChart, RealtimeTimeline,TimelineLine],
  pipes: [],
  encapsulation: ViewEncapsulation.None
})
@RouteConfig([
  {path: '/realtime', name: 'Realtime', component: RealtimeTimelineComponent},
  {path: '/timeline', name: 'Timeline', component: TimelineLineComponent}
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
