import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { environment } from './../environments/environment';

import { ManageComponent }   from './manage/manage.component';
import { NewComponent }   from './new/new.component';
import { ShareComponent }   from './share/share.component';
import { EditComponent }   from './edit/edit.component';
import { Editv2Component }   from './editv2/editv2.component';
import { ExtractionComponent }   from './extraction/extraction.component';
import { MapComponent }   from './map/map.component';

import { InfoResolver } from './info.resolver';
import { OntologyResolver } from './ontology.resolver';
import { OntologiesResolver } from './ontologies.resolver';
import { MapResolver } from './map.resolver';
import { SearchResolver } from './search.resolver';

import { Managev2Component }   from './managev2/managev2.component';

/* DA TOGLIERE */
// if(!environment.production)
//   window['BASE_ROUTING'] = '/cms/ontology.manager';
/***************/


let baseUrl = window['BASE_ROUTING'] || '';
baseUrl = baseUrl.replace('/', '');
const basePath = baseUrl ? baseUrl+'/' : '';
console.log(baseUrl, basePath)
// const basePath = baseUrl.indexOf('/')===0 ? baseUrl.substring(1) : baseUrl;
  
const routes: Routes = [
  { path: '', redirectTo: '/'+basePath+'manage', pathMatch: 'full' },
  { path: baseUrl, redirectTo: '/'+basePath+'manage', pathMatch: 'full' },
  { 
    path: basePath+'manage', 
    component: ManageComponent,
    // resolve: {
    //   info: InfoResolver
    // },
    children: [{
      path: ':type', component: Managev2Component, pathMatch: 'full',
      resolve: {
        info: InfoResolver
      },
    }]
  },
  { 
    path: basePath+'new', 
    component: NewComponent,
    resolve: {
      info: InfoResolver
    }
  },
  { path: basePath+'share/:id', component: ShareComponent },
  // { 
  //   path: basePath+'edit/:id', 
  //   component: EditComponent,
  //   resolve: {
  //     info: InfoResolver,
  //     ontology: OntologyResolver,
  //     ontologies: OntologiesResolver,
  //     // map: MapResolver
  //   }
  // },
  { 
    path: basePath+'edit/:id/:type', 
    component: Editv2Component,
    resolve: {
      info: InfoResolver,
      ontology: OntologyResolver,
      ontologies: OntologiesResolver,
      search: SearchResolver
      // map: MapResolver
    }
  },
  { 
    path: basePath+'extraction/:id', 
    component: ExtractionComponent,
    resolve: {
      info: InfoResolver,
      ontology: OntologyResolver
    }
  },
  { 
    path: basePath+'map/:id', 
    component: MapComponent,
    resolve: {
      map: MapResolver
    }
  }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}