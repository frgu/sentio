import {Component, OnInit, ViewEncapsulation} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {MatrixChart} from '../../directives/matrix-chart/matrix-chart.directive';

@Component({
  moduleId: __moduleName,
  selector: 'matrix',
  templateUrl: 'matrix.component.html',
  styleUrls: [],
  directives: [MatrixChart]
})
export class MatrixComponent implements OnInit {

  model = [];

  constructor() {}

  ngOnInit() {
    EventEmitterService.get('chartInit').subscribe( () => this.updateData());
  }

  configure(chart) {
      chart.key(function(d, i) { return i; })
          .value(function(d) { return d; })
          .margin({ top: 20, right: 2, bottom: 2, left: 80 });
  };

  swap(i, j, arr) {
      var t = arr[j];
      arr[j] = arr[i];
      arr[i] = t;
  }

  updateData() {

      var data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var series = [];

      series.push({ key: 'increasing', label: 'Increasing', values: data.map(function(d, i) { return i; }) });
      series.push({ key: 'decreasing', label: 'Decreasing', values: data.map(function(d, i, arr) { return arr.length - i - 1; }) });
      series.push({ key: 'upAndDown', label: 'Up and Down', values: data.map(function(d, i, arr) { return arr.length / 2 - Math.abs(-i + arr.length / 2); }) });
      series.push({ key: 'flatHigh', label: 'Flat High', values: data.map(function(d, i) { return 19; }) });
      series.push({ key: 'flatLow', label: 'Flat Low', values: data.map(function(d, i) { return 0; }) });
      series.push({ key: 'flatMid', label: 'Flat Mid', values: data.map(function(d, i) { return 10; }) });
      series.push({ key: 'spikeHigh', label: 'Spike High', values: data.map(function(d, i) { return (Math.random() > 0.1) ? 1 : 19; }) });
      series.push({ key: 'spikeLow', label: 'Spike Low', values: data.map(function(d, i) { return (Math.random() > 0.1) ? 19 : 1; }) });
      series.push({ key: 'random', label: 'random', values: data.map(function(d, i) { return Math.random() * 19; }) });

      // Remove a couple things
      series.splice(Math.floor(Math.random() * series.length), 1);
      series.splice(Math.floor(Math.random() * series.length), 1);

      // Swap a couple things
      this.swap(Math.floor(Math.random() * series.length), Math.floor(Math.random() * series.length), series);
      this.swap(Math.floor(Math.random() * series.length), Math.floor(Math.random() * series.length), series);

      this.model = series;
  };
  onResize(event){
    EventEmitterService.get('onResize').emit(event);
  }

}
