import {Component, OnInit, ViewEncapsulation} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {DonutChart} from '../../directives/donut-chart/donut-chart.directive';
import * as d3 from 'd3';

@Component({
    moduleId: __moduleName,
    selector: 'donut',
    templateUrl: 'donut.component.html',
    styleUrls: [],
    directives: [DonutChart],
    encapsulation: ViewEncapsulation.None
})
export class DonutComponent implements OnInit {

    model = [];
    constructor() { }

    ngOnInit() {
      EventEmitterService.get('chartInit').subscribe( () => this.updateData());
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
        this.model = data;
    }
    onResize(event) {
        EventEmitterService.get('onResize').emit(event);
    }

}
