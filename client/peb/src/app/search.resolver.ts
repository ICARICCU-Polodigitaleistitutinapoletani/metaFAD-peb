import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Rx';

import { OntologyService } from './ontology.service';

@Injectable()
export class SearchResolver implements Resolve<any> {

  constructor(
    private ontologyService: OntologyService
  ) { }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const id = decodeURIComponent(route.params['id']);
    const type = decodeURIComponent(route.params['type']);
    return this.ontologyService.searchItems(id, 'entities', {fromTop: type!='terminologies'});
  }
}