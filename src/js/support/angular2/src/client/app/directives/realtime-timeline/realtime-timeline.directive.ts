import {Directive, ElementRef, Input, OnInit, DoCheck, OnChanges, SimpleChange} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {Observable} from 'rxjs/Rx';
import * as d3 from 'd3';
declare function sentio_realtime_timeline();

@Directive({
    selector: 'realtime-timeline'
})
export class RealtimeTimeline implements DoCheck, OnChanges {

    private timeline;
    private timelineElement;
    private resizeWidth;
    private resizeHeight;
    private resizeTimer;

    data = [];
    private model = [];
    private markers = [];
    private interval = 30000;
    private yExtent = [0, undefined];
    private api = {};

    @Input() delay: number = 0;
    @Input() fps: number = 32;
    @Input() markerLabel = '';
    @Input() hoverText = '';

    @Input() sentioResizeWidth: number;
    @Input() sentioResizeHeight: number;

    constructor(el: ElementRef) {
        this.timelineElement = d3.select(el.nativeElement);
    }

    ngDoCheck() {
        this.timeline.data(this.model).redraw();
    }

    ngOnChanges(changes: { [key: string]: SimpleChange }) {
        if (this.timeline) {
            console.log(changes);
            if (changes['fps']) {
                this.timeline.fps(changes['fps'].currentValue).redraw();
            }
            if (changes['delay']) {
                this.timeline.delay(changes['delay'].currentValue).redraw();
            }
        }
    }

    ngOnInit() {
        this.resizeWidth = (null != this.sentioResizeWidth);
        this.resizeHeight = (null != this.sentioResizeHeight);
        this.timeline = sentio_realtime_timeline();

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

        this.timeline.init(this.timelineElement).data([]).start();
        // setup the marker callback method if one was provided
        if (null != this.markerHover) {
        				this.timeline.markerHover(this.markerHover);
        }

        this.configure(this.timeline);
        this.update();

        EventEmitterService.get('addMarker').subscribe(data => this.addMarker());
        EventEmitterService.get('doStart').subscribe(data => this.doStart());
        EventEmitterService.get('doStop').subscribe(data => this.doStop());
        EventEmitterService.get('onResize').subscribe(event => this.onResize(event));
    }

    configure(timeline) {
        timeline.fps(this.fps);
        timeline.delay(this.delay);
        timeline.interval(this.interval);
        timeline.yExtent().overrideValue(this.yExtent);
        this.doResize();
        timeline.redraw();
    };

    // Update the data and markers
    update() {
        var now = Math.floor(Date.now() / 1000) * 1000;
        this.data.push([now, (now % 10000) / 1000]);
        while (this.data.length > (this.interval + this.delay) / 1000 + 1) {
            this.data.shift();
        }
        this.model = [{ key: 'series1', data: this.data }];

        while (this.markers.length > 0 && this.markers[0][0] < Date.now() - this.interval - this.delay) {
            this.markers.shift();
        }
        Observable.timer(1000).subscribe(() => this.update());
    }

    // Add a marker
    addMarker() {
        var now = Date.now();
        this.markers.push([now, this.markerLabel]);
        this.timeline.markers(this.markers).redraw();
        this.markerLabel = '';
    }

    // Start and stop the timeline
    doStart() {
        this.timeline.start();
    }
    doStop() {
        this.timeline.stop();
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
    /**
     * Method invoked when a marker is hovered over
     */
    markerHover(payload) {
        console.log('Hover Payload: ' + JSON.stringify(payload));
        this.hoverText = JSON.stringify(payload);
    }

    doResize() {

        // Get the raw body element
        var body = document.body;

        // Cache the old overflow style
        var overflow = body.style.overflow;
        body.style.overflow = 'hidden';

        // Get the raw parent
        var rawElement = this.timelineElement[0][0].children[0];
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

        this.timeline.resize().redraw();
    }

}
