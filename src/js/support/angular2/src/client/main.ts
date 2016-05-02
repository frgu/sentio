import { enableProdMode } from 'angular2/core';
import { bootstrap } from 'angular2/platform/browser';
import { Angular2App } from './app/angular2';
import { environment } from './app/environment';

if (environment.production) {
  enableProdMode();
}

bootstrap(Angular2App);
