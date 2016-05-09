import {Directive, ElementRef, Input, OnInit, OnChanges, SimpleChange, AfterContentInit} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import * as d3 from 'd3';
declare function sentio_timeline_line();

@Directive({
    selector: 'timeline-line'
})
export class TimelineLine implements AfterContentInit, OnChanges {

    private timeline;
    private timelineElement;
    private resizeWidth;
    private resizeHeight;
    private resizeTimer;
    private isInitialized: boolean = false;

    @Input() configureFn;
    @Input() filterFn;
    @Input() filterState;
    @Input() interval;
    @Input() markerHover;
    @Input() markerLabel;
    @Input() markers;
    @Input() model;
    @Input() sentioResizeWidth;
    @Input() sentioResizeHeight;
    @Input() yExtent;
    @Input() xExtent;
    @Input() eventChannel: string;

    constructor(el: ElementRef) {
        this.timelineElement = d3.select(el.nativeElement);
    }
    ngAfterContentInit() {
        if (this.filterFn != null) {
            this.timeline.filter().on('filterend', (fs) => {
                setTimeout(() => {
                    // Call the function callback
                    this.filterFn(fs);
                });
            });
        }
        if (null != this.configureFn) {
            this.configureFn(this.timeline);
        }
    }
    ngOnChanges(changes: { [key: string]: SimpleChange }) {
        if (!this.isInitialized) {
            this._init();
        }

        if (changes['filterState']) {
            // If a filter was passed in and it is not the one we just set, do some updates
            if (null != changes['filterState'].currentValue
                && JSON.stringify(changes['filterState'].currentValue) != JSON.stringify(changes['filterState'].previousValue)) {

                // If we're in the original format with 3 parameters, use the second two only
                // TODO: We should go ahead and get rid of the 3 parameter style
                if (changes['filterState'].currentValue.length > 2) {
                    // The first element indicates if we're disabled
                    if (changes['filterState'].currentValue[0]) {
                        return;
                    }
                    this.filterState = changes['filterState'].currentValue.slice(1, 3);
                }
                this.timeline.setFilter(this.filterState);
                console.log({ msg: 'Watch Filter', filter: this.filterState });
            }
        }
        if (changes['model']) {
            this.timeline.data(changes['model'].currentValue).redraw();
        }
        if (changes['markers']) {
            this.timeline.markers(changes['markers'].currentValue).redraw();
        }
        if (changes['interval']) {
            this.timeline.interval(changes['interval'].currentValue).redraw();
        }
        if (changes['yExtent']) {
            this.timeline.yExtent().overrideValue(changes['yExtent'].currentValue);
            this.timeline.redraw();
        }
        if (changes['xExtent']) {
            this.timeline.xExtent().overrideValue(changes['xExtent'].currentValue);
            this.timeline.redraw();
        }
        if (changes['duration']) {
            this.timeline.duration(changes['duration'].currentValue);
        }
    }
    _init() {
        this.timeline = sentio_timeline_line();

        this.resizeWidth = (null != this.sentioResizeWidth);
        this.resizeHeight = (null != this.sentioResizeHeight);
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

        // Check to see if filtering is enabled
        if (null != this.filterFn || this.filterState) {
            this.timeline.filter(true);
        }

        EventEmitterService.get('onResize').subscribe(event => this.onResize(event));

        this.timeline.init(this.timelineElement);
        EventEmitterService.get(this.eventChannel || 'timelineInit').emit('done');
    }
    doResize() {
        // Get the raw body element
        var body = document.body;

        // Cache the old overflow style
        var overflow = body.style.overflow;
        body.style.overflow = 'hidden';

        // The first element child of our selector should be the <div> we injected
        var rawElement = this.timelineElement[0][0].firstElementChild;
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
}
