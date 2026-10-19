import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Header } from './core/layout/header/header';
import { apiInterceptor } from './core/interceptors/api-interceptor';
import { Footer } from './core/layout/footer/footer';
import { XuDrawer } from './core/layout/xu-drawer/xu-drawer';
import { NotFound } from './core/not-found/not-found';
import { SharedModule } from './shared/shared-module';

@NgModule({
  declarations: [App, Header, Footer, NotFound, XuDrawer],
  imports: [BrowserModule, AppRoutingModule, SharedModule],
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptors([apiInterceptor]), withInterceptorsFromDi())],
  bootstrap: [App],
})
export class AppModule {}
