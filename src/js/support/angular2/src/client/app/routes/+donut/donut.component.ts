import {Component, OnInit, ViewEncapsulation} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {DonutChart} from '../../directives/donut-chart/donut-chart.directive';

@Component({
  moduleId: __moduleName,
  selector: 'donut',
  templateUrl: 'donut.component.html',
  styleUrls: ['donut.component.css'],
  directives: [DonutChart],
  encapsulation: ViewEncapsulation.None
})
export class DonutComponent implements OnInit {

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
