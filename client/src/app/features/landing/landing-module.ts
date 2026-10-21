import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { LandingRoutingModule } from './landing-routing-module';
import { Landing } from './landing/landing';
import { Reveal } from './reveal';

@NgModule({
  declarations: [Landing, Reveal],
  imports: [SharedModule, LandingRoutingModule],
})
export class LandingModule {}
