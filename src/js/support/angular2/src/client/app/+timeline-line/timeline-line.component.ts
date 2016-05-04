import {Component, OnInit} from 'angular2/core';
import {TimelineLine} from '../directives/index';
import {EventEmitterService} from '../services/event-emitter-service.service';
@Component({
  moduleId: __moduleName,
  selector: 'timeline-line',
  templateUrl: 'timeline-line.component.html',
  styleUrls: ['timeline-line.component.css','/css/sentio.css' ],
  directives: [TimelineLine]
})
export class TimelineLineComponent implements OnInit {

  constructor() {}

  ngOnInit() {
  }

  updateData(){
    EventEmitterService.get('updateData').emit('click');
  }
  updateFilter(){
    EventEmitterService.get('updateFilter').emit('click');
  }
  onResize(event){
    EventEmitterService.get('onResize').emit(event);
  }
}
