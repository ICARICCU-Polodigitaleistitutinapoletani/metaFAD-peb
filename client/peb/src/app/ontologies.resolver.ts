import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Rx';

import { OntologyService } from './ontology.service';
import { of } from 'rxjs';

@Injectable()
export class OntologiesResolver implements Resolve<any> {

  constructor(
    private ontologyService: OntologyService
  ) { }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return of(true)
    // return this.ontologyService.getOntologiesSimple();
  }
}