import {Component, OnInit, Output, EventEmitter, Input, ViewEncapsulation} from 'angular2/core';
import {RealtimeTimeline} from '../../directives/realtime-timeline/realtime-timeline.directive';
import {EventEmitterService} from '../../services/event-emitter-service.service';
@Component({
  moduleId: __moduleName,
  selector: 'realtime',
  templateUrl: 'realtime.component.html',
  styleUrls: ['realtime.component.css'],
  directives:[RealtimeTimeline],
  encapsulation: ViewEncapsulation.None
})
export class RealtimeComponent implements OnInit {

  constructor() {
  }

  fps = 32;
  markerLabel = '';
  hoverText = '';
  delay = 0;

  ngOnInit() {
  }
  addMarker(){
    EventEmitterService.get('addMarker').emit('click');
  }
  doStart(){
    EventEmitterService.get('doStart').emit('click');
  }
  doStop(){
    EventEmitterService.get('doStop').emit('click');
  }
  onResize(event){
    EventEmitterService.get('onResize').emit(event);
  }


}
