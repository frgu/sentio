import {Component, OnInit, Output, EventEmitter, Input, ViewEncapsulation} from 'angular2/core';
import {RealtimeTimeline} from '../../directives/realtime-timeline/realtime-timeline.directive';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import {Observable} from 'rxjs/Rx';
@Component({
    moduleId: __moduleName,
    selector: 'realtime',
    templateUrl: 'realtime.component.html',
    styleUrls: [],
    directives: [RealtimeTimeline],
    encapsulation: ViewEncapsulation.None
})
export class RealtimeComponent implements OnInit {

    constructor() {
    }

    data = [];
    delay = 0;
    fps = 32;
    hoverText = '';
    interval = 30000;
    markerLabel = '';
    markers = [];
    model = [];
    yExtent = [0, undefined];

    ngOnInit() {
      EventEmitterService.get('timelineInit').subscribe( () => this.update());
    }

    configure(timeline) {
    }
    /**
     * Method invoked when a marker is hovered over
     */
    markerHover = (payload) => {
        console.log('Hover Payload: ' + JSON.stringify(payload));
        this.hoverText = JSON.stringify(payload);
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
        //Observable.timer(1000).subscribe(() => this.update());
        setTimeout( () => this.update(), 1000);
    }

    addMarker() {
        EventEmitterService.get('addMarker').emit('click');
    }
    doStart() {
        EventEmitterService.get('doStart').emit('click');
    }
    doStop() {
        EventEmitterService.get('doStop').emit('click');
    }
    onResize(event) {
        EventEmitterService.get('onResize').emit(event);
    }


}
