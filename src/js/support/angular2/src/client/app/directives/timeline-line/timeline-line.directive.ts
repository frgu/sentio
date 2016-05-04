import {Directive, ElementRef, Input, OnInit, DoCheck, OnChanges, SimpleChange} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import * as d3 from 'd3';
declare function sentio_timeline_line();

@Directive({
    selector: 'timeline-line'
})
export class TimelineLine implements DoCheck, OnChanges {

    private timeline;
    private timelineElement;
    private resizeWidth;
    private resizeHeight;
    private resizeTimer;
    private redrawTimer;
    public filterState;
    public lastFilterState;

    @Input() sentioResizeWidth: number;
    @Input() sentioResizeHeight: number;
    @Input() sentioFilter: boolean;

    data = [];
    private model = [];
    private markers = [];
    private interval = 60000;
    private binSize = 1000;
    private yExtent = [0, undefined];
    private hwm = Date.now();

    constructor(el: ElementRef) {
        this.timelineElement = d3.select(el.nativeElement);
    }

    ngOnChanges(changes: { [key: string]: SimpleChange }) {


    }

    ngDoCheck() {
        if (null != this.filterState && this.filterState !== this.lastFilterState) {

            // If we're in the original format with 3 parameters, use the second two only
            // TODO: We should go ahead and get rid of the 3 parameter style
            if (this.filterState.length > 2) {
                // The first element indicates if we're disabled
                if (this.filterState[0]) {
                    return;
                }
                this.filterState = this.filterState.slice(1, 3);
            }
            this.timeline.setFilter(this.filterState).redraw();
            this.lastFilterState = this.filterState;
            console.log({ msg: 'Watch Filter', filter: this.filterState });
        }
    }

    ngOnInit() {
        this.resizeWidth = (null != this.sentioResizeWidth);
        this.resizeHeight = (null != this.sentioResizeHeight);
        this.timeline = sentio_timeline_line();

        // Extract the height and width of the chart
        var width = this.timelineElement[0][0].style.width;
        if (null != width && '' !== width) {
            width = parseFloat(width.substring(0, width.length - 2));
            if (null != width && !isNaN(width)) { this.timeline.width(width); }
        }
        var height = this.timelineElement[0][0].style.height;
        if (null != height && '' !== height) {
            height = parseFloat(height.substring(0, height.length - 2));
            if (null != height && !isNaN(height)) { this.timeline.height(height); }
        }

        // Store the filter state outside the scope as well as inside, to compare
        this.lastFilterState = null;
        // Check to see if filtering is enabled
        if (null != this.sentioFilter) {
            this.timeline.filter(this.sentioFilter);

            this.timeline.filter().on('filterend', (fs) => {
                setTimeout(() => {
                    // Call the function callback
                    this.filter({ filterState: fs });

                    // Set the two-way-bound scope parameter
                    this.filterState = fs;

                    // Store the filter state locally so we can suppress updates on our own changes
                    this.lastFilterState = fs;
                });
            });
        }

        this.timeline.init(this.timelineElement);
        this.configure(this.timeline);
        this.updateData();
        this.doResize();

        EventEmitterService.get('updateData').subscribe(data => this.updateData());
        EventEmitterService.get('updateFilter').subscribe(data => this.updateFilter());
        EventEmitterService.get('onResize').subscribe(event => this.onResize(event));
    }

    generateData(start) {
        var toReturn = [];
        for (var i = 0; i < this.interval / this.binSize; i++) {
            toReturn.push([start + i * this.binSize, Math.random() * 10]);
        }
        return toReturn;
    };

    generateMarkers(start, samples) {
        this.markers = [];

        var toReturn = [];
        for (var i = 0; i < samples; i++) {
            toReturn.push([start + Math.random() * this.interval, i]);
        }
        return toReturn;
    };

    updateData() {
        this.hwm = Date.now();
        this.model = [{ key: 'series1', data: this.generateData(this.hwm - this.interval) }];
        this.markers = this.generateMarkers(this.hwm - this.interval, 25);
        this.timeline.markers(this.markers);
        this.timeline.data(this.model).redraw();
    }

    filter(filterState) {
        console.log(filterState);
    };

    configure(chart) {
        chart.markers().on('onclick', function(marker) {
            console.log(marker);
        });
    };

    updateFilter() {
        var lf = this.hwm - Math.random() * this.interval;
        var hf = lf + Math.random() * 20000;
        var newFilter = [lf, hf];
        console.log({ m: 'Applying filter', filter: newFilter });

        this.filterState = newFilter;
        this.timeline.setFilter(this.filterState).redraw();
    };
    doResize() {

        // Get the raw body element
        var body = document.body;

        // Cache the old overflow style
        var overflow = body.style.overflow;
        body.style.overflow = 'hidden';

        // Get the raw parent
        var rawElement = this.timelineElement[0][0].firstChild;
        // Derive height/width of the parent (there are several ways to do this depending on the parent)
        var parentWidth = rawElement.attributes.width | rawElement.style.width | rawElement.clientWidth;
        var parentHeight = rawElement.attributes.height | rawElement.style.height | rawElement.clientHeight;

        // Calculate the new width/height based on the parent and the resize size
        var width = (this.resizeWidth) ? parentWidth - this.sentioResizeWidth : undefined;
        var height = (this.resizeHeight) ? parentHeight - this.sentioResizeHeight : undefined;

        // Reapply the old overflow setting
        body.style.overflow = overflow;

        console.debug('resize rt.timeline height: ' + height + ' width: ' + width);

        // Apply the new width and height
        if (this.resizeWidth) { this.timeline.width(width); }
        if (this.resizeHeight) { this.timeline.height(height); }

        this.timeline.resize();
        this.timeline.redraw();
    };

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

}
