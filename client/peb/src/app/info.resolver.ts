import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Rx';

import { OntologyService } from './ontology.service';

@Injectable()
export class InfoResolver implements Resolve<any> {

  constructor(
    private ontologyService: OntologyService
  ) { }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const instance: string = route.queryParamMap.get('instance');
    return this.ontologyService.getInfo(instance);
  }
}