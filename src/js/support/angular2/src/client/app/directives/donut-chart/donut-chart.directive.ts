import {Directive, ElementRef, Input, OnInit} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import * as d3 from 'd3';
declare function sentio_chart_donut();

@Directive({
    selector: 'donut-chart'
})
export class DonutChart implements OnInit {

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

    ngOnInit() {
        this.resizeWidth = (null != this.sentioResizeWidth);
        this.resizeHeight = (null != this.sentioResizeHeight);
        this.chart = sentio_chart_donut();

        // Extract the width of the chart
        var width = this.chartElement[0][0].style.width;
        if (null != width && '' !== width) {
            width = parseFloat(width.substring(0, width.length - 2));
            if (null != width && !isNaN(width)) {
                this.chart.width(width);
                // set height to match width in this case to keep the donut round
                this.chart.height(width);
            }
        }

        this.chart.init(this.chartElement);
        this.configureDonutChart(this.chart);
        this.doResize();
        this.updateData();
        EventEmitterService.get('updateData').subscribe(data => this.updateData());
        EventEmitterService.get('onResize').subscribe(event => this.onResize(event));
    }

    configureDonutChart(chart) {
        chart.label(function(d) {
            return d.key + '(' + d.value + ')';
        });

        // Create custom color scale
        var color = d3.scale.ordinal()
            .range(['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c']);

        chart.color(color);
    }

    updateData() {
        var data = [];
        for (var i = 0; i < 4; i++) {
            var d = {
                key: 'key' + i,
                value: Math.floor(Math.random() * 10)
            };
            if (i == 2) {
                d.key = 'long test key'
            }
            data.push(d);
        }

        this.chart.data(data);
        this.chart.redraw();
    }

    delayResize() {
        if (undefined !== this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() => this.doResize(), 200);
    }
    onResize(event) {
        if (this.resizeWidth || this.resizeHeight) {
            this.delayResize();
        }
    }

    doResize() {
        // Get the raw body element
        var body = document.body;

        // Cache the old overflow style
        var overflow = body.style.overflow;
        body.style.overflow = 'hidden';

        // Get the raw parent
        var rawElement = this.chartElement[0][0].firstChild;
        // Derive width of the parent (there are several ways to do this depending on the parent)
        var parentWidth = rawElement.attributes.width | rawElement.style.width | rawElement.clientWidth;

        // Calculate the new width based on the parent and the resize size
        var width = (this.resizeWidth) ? parentWidth - this.sentioResizeWidth : undefined;

        // Set height to match width to keep donut round
        var height = width;

        // Reapply the old overflow setting
        body.style.overflow = overflow;

        // Get the old widths and heights
        var oldHeight = this.chart.height();
        var oldWidth = this.chart.width();

        if (height !== oldHeight || width !== oldWidth) {
            console.debug('resize donut.chart width: ' + width);
            console.debug('resize donut.chart height: ' + height);

            // Apply the new height
            if (this.sentioResizeHeight) { this.chart.height(height); }
            // Apply the new width
            if (this.sentioResizeWidth) { this.chart.width(width); }
            this.chart.resize();
            this.chart.redraw();
        } else {
            console.debug('resize donut.chart width unchanged: ' + width);
            console.debug('resize donut.chart height unchanged: ' + height);
        }
    }
}
