import {Component, Output, EventEmitter} from 'angular2/core';
import {RouteConfig, ROUTER_DIRECTIVES, ROUTER_PROVIDERS} from 'angular2/router';
import {EventEmitterService} from './services/event-emitter-service.service';
import {DonutComponent} from './routes/+donut/donut.component';
import {MatrixComponent} from './routes/+matrix/matrix.component';
import {RealtimeComponent} from './routes/+realtime/realtime.component';
import {TimelineComponent} from './routes/+timeline/timeline.component';
import {VerticalComponent} from './routes/+vertical/vertical.component';
@Component({
    moduleId: __moduleName,
    selector: 'angular2-app',
    providers: [ROUTER_PROVIDERS, EventEmitterService],
    templateUrl: 'angular2.html',
    styleUrls: ['angular2.css','/css/sentio.css'],
    directives: [ROUTER_DIRECTIVES],
    pipes: []
})
@RouteConfig([
    { path: '/donut', name: 'Donut', component: DonutComponent },
    { path: '/matrix', name: 'Matrix', component: MatrixComponent },
    { path: '/realtime', name: 'Realtime', component: RealtimeComponent },
    { path: '/timeline', name: 'Timeline', component: TimelineComponent },
    { path: '/vertical', name: 'Vertical', component: VerticalComponent }
])

export class Angular2App {
    defaultMeaning: number = 42;
    meaningOfLife(meaning?: number) {
        return `The meaning of life is ${meaning || this.defaultMeaning}`;
    }
}
