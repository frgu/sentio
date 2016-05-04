import {Component, OnInit, ViewEncapsulation} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {TimelineLine} from '../../directives/timeline-line/timeline-line.directive';

@Component({
  moduleId: __moduleName,
  selector: 'timeline',
  templateUrl: 'timeline.component.html',
  styleUrls: ['timeline.component.css'],
  directives: [TimelineLine]
})
export class TimelineComponent implements OnInit {

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
