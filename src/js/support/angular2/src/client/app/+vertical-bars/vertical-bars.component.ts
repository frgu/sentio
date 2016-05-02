import {Component, OnInit, Input} from 'angular2/core';
import {VerticalBarChart} from '../vertical-bar-chart/vertical-bar-chart.directive';
@Component({
    moduleId: __moduleName,
    selector: 'vertical-bars',
    templateUrl: 'vertical-bars.component.html',
    styleUrls: ['vertical-bars.component.css'],
    directives: [VerticalBarChart],
    providers: []
})
export class VerticalBarsComponent {

    constructor() {}

}
