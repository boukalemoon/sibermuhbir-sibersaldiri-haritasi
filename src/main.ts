import {bootstrapApplication} from '@angular/platform-browser';
import {App} from './app/app';
import {appConfig} from './app/app.config';
import {inject} from '@vercel/analytics';

inject(); // Vercel Analytics — sayfa görüntülemelerini otomatik izler

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
