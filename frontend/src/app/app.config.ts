import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { userHeaderInterceptor } from './services/user-header.interceptor';
import { provideIonicAngular } from '@ionic/angular/standalone';

export const appConfig: ApplicationConfig = {
  providers: [
    provideIonicAngular({
      mode: 'md',
      animated: true,
    }),
    provideHttpClient(withInterceptors([userHeaderInterceptor])),
  ],
};
