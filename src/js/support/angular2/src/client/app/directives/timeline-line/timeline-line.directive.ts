import {Directive, ElementRef, Input, OnInit} from 'angular2/core';
import {EventEmitterService} from '../../services/event-emitter-service.service';
import * as d3 from 'd3';
declare function sentio_timeline_line();

@Directive({
  selector: 'timeline-line'
})
export class TimelineLine {

  constructor() {}

}
