import {Component, OnInit, Output, EventEmitter, Input} from 'angular2/core';
import {RealtimeTimeline} from '../directives/index';
import {EventEmitterService} from '../services/event-emitter-service.service';
@Component({
  moduleId: __moduleName,
  selector: 'realtime-timeline',
  templateUrl: 'realtime-timeline.component.html',
  styleUrls: ['realtime-timeline.component.css','/css/sentio.css'],
  directives:[RealtimeTimeline]
})
export class RealtimeTimelineComponent implements OnInit {

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
