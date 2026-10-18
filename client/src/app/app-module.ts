import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Header } from './core/layout/header/header';
import { Footer } from './core/layout/footer/footer';
import { NotFound } from './core/not-found/not-found';
import { SharedModule } from './shared/shared-module';

@NgModule({
  declarations: [App, Header, Footer, NotFound],
  imports: [BrowserModule, AppRoutingModule, SharedModule],
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptorsFromDi())],
  bootstrap: [App],
})
export class AppModule {}
