import {Component, OnInit, ViewEncapsulation} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {TimelineLine} from '../../directives/timeline-line/timeline-line.directive';

@Component({
  moduleId: __moduleName,
  selector: 'timeline',
  templateUrl: 'timeline.component.html',
  styleUrls: [],
  directives: [TimelineLine]
})
export class TimelineComponent implements OnInit {

  interval = 60000;
  binSize = 1000;
  hwm = Date.now();
  model = [];
  markers = [];
  filterState = [];

  constructor() {}

  ngOnInit() {
    EventEmitterService.get('timelineInit').subscribe( () => this.updateData());
  }
  generateData(start) {
      var toReturn = [];
      for (var i = 0; i < this.interval / this.binSize; i++) {
          toReturn.push([start + i * this.binSize, Math.random() * 10]);
      }
      return toReturn;
  }
  generateMarkers(start, samples) {
      this.markers = [];

      var toReturn = [];
      for (var i = 0; i < samples; i++) {
          toReturn.push([start + Math.random() * this.interval, i]);
      }
      return toReturn;
  }
  updateData() {
      this.hwm = Date.now();
      this.model = [{ key: 'series1', data: this.generateData(this.hwm - this.interval) }];
      this.markers = this.generateMarkers(this.hwm - this.interval, 25);
  }
  /*
    This is to mimic the callback funcitonality of the Angular 1 example
    having the function defined as filter(filterState){...} would scope
    'this' as the child component and so 2-way binding would still be achieved.

    Arrow notation definition causes the parent component's filterState to change,
    triggering the OnChanges callback for filterState in the child.
  */
  filter = (filterState) => {
      console.log(filterState);
      this.filterState = filterState;
  }
  configure(chart) {
      chart.markers().on('onclick', function(marker) {
          console.log(marker);
      });
  }
  updateFilter() {
      var lf = this.hwm - Math.random() * this.interval;
      var hf = lf + Math.random() * 20000;
      var newFilter = [lf, hf];
      console.log({ m: 'Applying filter', filter: newFilter });

      this.filterState = newFilter;
  }
  onResize(event){
    EventEmitterService.get('onResize').emit(event);
  }

}
