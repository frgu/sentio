import {Directive, ElementRef, Input, OnInit} from 'angular2/core';
import * as d3 from 'd3';
declare function sentio_chart_vertical_bars();
import {EventEmitterService} from '../event-emitter-service.service';
@Directive({
  selector: 'vertical-bar-chart'
})
export class VerticalBarChart implements OnInit{
  private chart;
  private chartElement;
  private resizeWidth;
  public model = [];
  private widthExtent = [0, undefined];

  constructor(el: ElementRef) {
    this.chartElement = d3.select(el.nativeElement);
  }
  ngOnInit(){
    this.chart = sentio_chart_vertical_bars();

    // Extract the width of the chart
			var width = this.chartElement[0][0].style.width;
			if(null != width && '' !== width) {
				width = parseFloat(width.substring(0, width.length-2));
				if(null != width && !isNaN(width)) { this.chart.width(width); }
			}

    this.chart.init(this.chartElement);
    this.configureBarChart(this.chart);
    this.updateData();
    this.chart.data(this.model);
    this.chart.widthExtent().overrideValue(this.widthExtent);
    this.redraw();
    EventEmitterService.get('updateData').subscribe(data => this.updateData());
  }

  configureBarChart(chart) {
    chart.label(function(d) {
      return d.key + '&lrm; (' + d.value + ')';
    });
  }

  generateData(samples) {
    var toReturn = [];
    for(var i=0; i<samples; i++){
      toReturn.push({
        key: 'key:' + i,
        value: Math.floor(Math.random() * samples)
      });
    }
    return toReturn;
  }

  updateData(){
    var data = this.generateData(16);

    data = data.sort(function(a, b) {
      return b.value - a.value;
    }).slice(0, 12);

    this.model = data;
    this.chart.data(this.model);
    this.redraw();

  }
  // Do the redraw only once when the $digest cycle has completed
	redraw() {
		this.chart.redraw();
	}

  doResize() {

				// Get the raw body element
				var body = document[0].body;


				// Cache the old overflow style
				var overflow = body.style.overflow;
				body.style.overflow = 'hidden';

				// Get the raw parent
				var rawElement = this.chartElement[0];
				// Derive width of the parent (there are several ways to do this depending on the parent)
				var parentWidth = rawElement.attributes.width | rawElement.style.width | rawElement.clientWidth;

				// Calculate the new width based on the parent and the resize size
				var width = (this.resizeWidth)? /*parentWidth - attrs.sentioResizeWidth*/ 200 : undefined;

				// Reapply the old overflow setting
				body.style.overflow = overflow;

				//console.debug('resize verticalBars.chart width: ' + width);

				// Apply the new width
				if(this.resizeWidth){ this.chart.width(width); }

				this.chart.resize();
				this.redraw();
			}

}
