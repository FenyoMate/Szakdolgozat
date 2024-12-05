import {Routes} from '@angular/router';
import {ChatComponent} from './chat/chat.component';
import {NewChatComponent} from './new-chat/new-chat.component';
import {TunedModelComponent} from './tunedModels/tunedModel.component';
import {LoginComponent} from './login/login.component';
import {SettingsComponent} from './settings/settings.component';
import {NewModelComponent} from './new-model/new-model.component';
import {SignupComponent} from './signup/signup.component';


export const routes: Routes = [
  { path: 'chat', component: ChatComponent },
  { path: 'chat/:id', component: NewChatComponent },
  { path: 'model', component: TunedModelComponent },
  { path: 'model/:id', component: NewModelComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'settings/:id', component: SettingsComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
