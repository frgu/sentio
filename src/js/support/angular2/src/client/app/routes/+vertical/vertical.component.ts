import {Component, OnInit, ViewEncapsulation} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {VerticalBarChart} from '../../directives/vertical-bar-chart/vertical-bar-chart.directive';

@Component({
  moduleId: __moduleName,
  selector: 'vertical',
  templateUrl: 'vertical.component.html',
  styleUrls: [],
  directives: [VerticalBarChart],
  encapsulation: ViewEncapsulation.None
})
export class VerticalComponent implements OnInit {

  model = [];
  widthExtent = [0, undefined];

  constructor() {}

  ngOnInit() {
    EventEmitterService.get('chartInit').subscribe( () => this.updateData());
  }

  configureBarChart(chart) {
      chart.label(function(d) {
          return d.key + '&lrm; (' + d.value + ')';
      });
  }

  generateData(samples) {
      var toReturn = [];
      for (var i = 0; i < samples; i++) {
          toReturn.push({
              key: 'key:' + i,
              value: Math.floor(Math.random() * samples)
          });
      }
      return toReturn;
  }

  updateData() {
      var data = this.generateData(16);

      data = data.sort(function(a, b) {
          return b.value - a.value;
      }).slice(0, 12);

      this.model = data;

  }
  onResize(event){
    EventEmitterService.get('onResize').emit(event);
  }

}
