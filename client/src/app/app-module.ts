import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Header } from './core/layout/header/header';
import { apiInterceptor } from './core/interceptors/api-interceptor';
import { Footer } from './core/layout/footer/footer';
import { Drawers } from './core/layout/drawers/drawers';
import { AreaDialog } from './core/layout/area-dialog/area-dialog';
import { Toast } from './core/layout/toast/toast';
import { ChatWidget } from './core/layout/chat-widget/chat-widget';
import { AntParade } from './core/layout/ant-parade/ant-parade';
import { NotFound } from './core/not-found/not-found';
import { SharedModule } from './shared/shared-module';

@NgModule({
  declarations: [App, Header, Footer, NotFound, Drawers, AreaDialog, Toast, ChatWidget, AntParade],
  imports: [BrowserModule, AppRoutingModule, SharedModule],
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptors([apiInterceptor]), withInterceptorsFromDi())],
  bootstrap: [App],
})
export class AppModule {}
