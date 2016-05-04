import {Component, OnInit, ViewEncapsulation} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {VerticalBarChart} from '../../directives/vertical-bar-chart/vertical-bar-chart.directive';

@Component({
  moduleId: __moduleName,
  selector: 'vertical',
  templateUrl: 'vertical.component.html',
  styleUrls: ['vertical.component.css'],
  directives: [VerticalBarChart],
  encapsulation: ViewEncapsulation.None
})
export class VerticalComponent implements OnInit {

  constructor() {}

  ngOnInit() {
  }

  updateData(){
    EventEmitterService.get('updateData').emit('click');
  }
  onResize(event){
    EventEmitterService.get('onResize').emit(event);
  }

}
