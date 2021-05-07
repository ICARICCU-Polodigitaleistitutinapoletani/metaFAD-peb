import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Rx';

import { OntologyService } from './ontology.service';

@Injectable()
export class OntologyResolver implements Resolve<any> {

  constructor(
    private ontologyService: OntologyService
  ) { }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const id = decodeURIComponent(route.params['id']);
    return this.ontologyService.getOntology(id);
  }
}