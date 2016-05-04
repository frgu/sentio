import {Directive, ElementRef, OnInit, Input} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import * as d3 from 'd3';
declare function sentio_chart_matrix();

@Directive({
  selector: 'matrix-chart'
})
export class MatrixChart {

  private chart;
  private chartElement;
  private resizeWidth;
  private resizeHeight;
  private resizeTimer;

  @Input() sentioResizeWidth;
  @Input() sentioResizeHeight;

  constructor(el: ElementRef) {
    this.chartElement = d3.select(el.nativeElement);
  }

  ngOnInit(){
    this.chart = sentio_chart_matrix();

    // Extract the width of the chart
      var width = this.chartElement[0][0].style.width;
      if(null != width && '' !== width) {
        width = parseFloat(width.substring(0, width.length-2));
        if(null != width && !isNaN(width)) {
          this.chart.width(width);
          // set height to match width in this case to keep the donut round
          this.chart.height(width);
        }
      }

    this.chart.init(this.chartElement);
    this.configure(this.chart);
    this.updateData();
    EventEmitterService.get('updateData').subscribe(data => this.updateData());
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
				series.push({ key: 'upAndDown', label: 'Up and Down', values: data.map(function(d, i, arr) { return arr.length/2 - Math.abs(-i + arr.length/2); }) });
				series.push({ key: 'flatHigh', label: 'Flat High', values: data.map(function(d, i) { return 19; })});
				series.push({ key: 'flatLow', label: 'Flat Low', values: data.map(function(d, i) { return 0; }) });
				series.push({ key: 'flatMid', label: 'Flat Mid', values: data.map(function(d, i) { return 10; }) });
				series.push({ key: 'spikeHigh', label: 'Spike High', values: data.map(function(d, i) { return (Math.random() > 0.1)? 1 : 19; }) });
				series.push({ key: 'spikeLow', label: 'Spike Low', values:data.map(function(d, i) { return (Math.random() > 0.1)? 19 : 1; }) });
				series.push({ key: 'random', label: 'random', values: data.map(function(d, i) { return Math.random() * 19; }) });

				// Remove a couple things
				series.splice(Math.floor(Math.random() * series.length), 1);
				series.splice(Math.floor(Math.random() * series.length), 1);

				// Swap a couple things
				this.swap(Math.floor(Math.random() * series.length), Math.floor(Math.random() * series.length), series);
				this.swap(Math.floor(Math.random() * series.length), Math.floor(Math.random() * series.length), series);

				this.chart.data(series);
        this.chart.redraw();
			};
      
}
