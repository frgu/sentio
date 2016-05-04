import {Component, OnInit, ViewEncapsulation} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {MatrixChart} from '../../directives/matrix-chart/matrix-chart.directive';

@Component({
  moduleId: __moduleName,
  selector: 'matrix',
  templateUrl: 'matrix.component.html',
  styleUrls: ['matrix.component.css'],
  directives: [MatrixChart]
})
export class MatrixComponent implements OnInit {

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
