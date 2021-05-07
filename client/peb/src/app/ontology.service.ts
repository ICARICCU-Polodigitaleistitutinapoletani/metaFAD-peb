import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';

import { BehaviorSubject, Observable , of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { SpinnerService } from './spinner.service';

import { Ontology } from './ontology';
import { INFO } from './data/mock-info';
import { ONTOLOGIES } from './data/mock-ontologies_list';
import { ONTOLOGY } from './data/mock-ontologies_edit';
import { environment } from '../environments/environment';

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json' ,
    // 'Access-Control-Allow-Headers': 'Content-Type',
    // 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    // 'Access-Control-Allow-Origin': '*'
  })
};

@Injectable()
export class OntologyService {

  private baseUrl = window['REST_URL'] || `${environment.host}/rest/ontologymanager/`;
  fromCreate: boolean = false;
  info: { [key: string]: any };
  reloadSearch: EventEmitter<string> = new EventEmitter();
  ternaryOrigin: { [key: string]: any };
  fromFacilitated: string;
  // onSaveTerminology$: BehaviorSubject<{ [key: string]: any }> = new BehaviorSubject(null);
  onSaveTerminology;
  lang: string = environment.lang;

  constructor(
    private http: HttpClient,
    private spinner: SpinnerService
  ) { }

  _encodeId(p) {
    // p.id = encodeURIComponent(p.id);
    // if(p.value && p.value.id)
    //   p.value.id = encodeURIComponent(p.value.id);
    // if(p.value && p.value.value && p.value.value.id)
    //   p.value.id = encodeURIComponent(p.value.id);
    // if(p.values)
    //   p.values.map(v => v = this._encodeId(v));
    return p;
  }

  _setInfo(item) {
    item.info = {
      properties: {
        count: item.properties
      },
      relations: {
        count: item.relations
      },
      terminologies: {
        count: item.terminologies
      }
    };

    // item.properties.map(p => {
    //   if(!item.info[p.type])
    //     item.info[p.type] = {count: 0};
    //   item.info[p.type].count++;
    // });

    Object.keys(item.info).map(key => {
      switch(key) {
        case 'terminologies':
          item.info[key].label = (item.info[key].count!==1) ? this.info.labels['terminologies'] : this.info.labels['terminology'];
          break;
        case 'relations':
          item.info[key].label = (item.info[key].count!==1) ? this.info.labels['relations'] : this.info.labels['relation'];
          break;
        case 'properties':
          item.info[key].label = this.info.labels['property'];
          break;
        default:
          delete item.info[key];
          break;
      }
    });
  }

  _parseOntology(ontology) {
    ontology.items.map(item => {
      item.label = INFO.labels[item.type];
      // this._setInfo(item);
    });
    return ontology;
  }


  private extractData(res: Response) {
    let body = res.json();
    return body;
  }
  getInfo(instance?: string): Observable<{[k: string]: any}> {
    if(this.info) {
      return of(this.info);
    }
    this.spinner.show();
    let url = `${this.baseUrl}info`;
    if(instance)
      url += '?instance='+instance;
    return this.http.get<{[k: string]: any}>(url)
      .pipe(
        map(info => {
          const keys = Object.keys(info.properties);
          keys.map(key => {
            const keys2 = Object.keys(info.properties[key]);
            keys2.map(key2 => {
              info.properties[key][key2].map(p => {
                this._encodeId(p);
              });
            });
          });
          this.info = info;
          this.spinner.hide();
          return info;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );


      // const keys = Object.keys(INFO.properties);
    // keys.map(key => {
    //   const keys2 = Object.keys(INFO.properties[key]);
    //   keys2.map(key2 => {
    //     INFO.properties[key][key2].map(p => {
    //       this._encodeId(p);
    //     })
    //   });
    // });
    // return of(INFO);
  }

  getSelectedThemeThreads(theme: string): Observable<{[k: string]: any}[]> {
    return this.http.get<{[k: string]: any}[]>('').pipe(
      map(result =>
        result.filter(one => one.theme === theme)
      )
    )
  }

  getOntologies(): Observable<Ontology[]> {
    this.spinner.show();
    const url = `${this.baseUrl}ontologies`;
    return this.http.get<Ontology[]>(url)
      .pipe(
        map(ontologies => {
          if(!Array.isArray(ontologies))
            ontologies = [ontologies];

          ontologies.map(o => this._encodeId(o));
          this.spinner.hide();
          return ontologies;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );

    // return of(ONTOLOGIES);
  }

  getOntology(id: string): Observable<Ontology> {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}`;
    return this.http.get<{[k: string]: any}>(url)
      .pipe(
        map(ontology => {
          this.spinner.hide();
          return this._parseOntology(ontology);
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );

    // return of(this._parseOntology(ONTOLOGY));
  }

  shareOntology(id: string, value: boolean): Observable<Ontology> {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}/share`;
    return this.http.post<any>(url, value, httpOptions)
      .pipe(
        map(data => {
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );

    // let ontology = ONTOLOGIES.find(ontology => ontology.id === id);
    // ontology.shared = !ontology.shared;
    // return of(ontology);
  }

  deleteOntology(id: string): Observable<{ [key: string]: any }> {
    //this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}`;
    return this.http.delete<any>(url)
      .pipe(
        map(data => {
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );

    // const index = ONTOLOGIES.map(ontology => ontology.id).indexOf(id);
    // ONTOLOGIES.splice(index, 1);
    // return of({ id });
  }

  deleteOntologyContents(id: string): Observable<{ [key: string]: any }> {
    //this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontologyContents/${id}`;
    return this.http.delete<any>(url)
      .pipe(
        map(data => {
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  deleteItem(id: string, type: string, ontologyId: string): Observable<{ [key: string]: any }[]> {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    ontologyId = encodeURIComponent(ontologyId);
    ontologyId = encodeURIComponent(ontologyId);
    const url = `${this.baseUrl}${type}/${ontologyId}/${id}`;
    return this.http.delete<any>(url)
      .pipe(
        map(data => {
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  // deleteItem(ontologyId: string, itemId: string): Observable<void> {
  //   const index = ONTOLOGIES.map(ontology => ontology.id).indexOf(ontologyId);
  //   const index2 = ONTOLOGIES[index].items.map(item => item.id).indexOf(itemId);
  //   ONTOLOGIES[index].items.splice(index2, 1);
  //   return of();
  // }

  updateOntology(id, ontology) {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}`;
    return this.http.post<{[k: string]: any}>(url, ontology, httpOptions)
      .pipe(
        map(ontology => {
          this.spinner.hide();
          if(ontology.message)
            return ontology;
          else
            return this._parseOntology(ontology);
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  updateOntologyName(id: string, name: object) {
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}/title`;
    return this.http.post<{[k: string]: any}>(url, name, httpOptions)
      .pipe(
        map(data => data),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  updateOntologyUri(id: string, uri: string) {
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}/uri`;
    return this.http.post<{[k: string]: any}>(url, uri, httpOptions)
      .pipe(
        map(data => data),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  createOntology(ontology) {
    this.spinner.show();
    const url = `${this.baseUrl}ontology/new`;
    return this.http.post<{[k: string]: any}>(url, ontology, httpOptions)
      .pipe(
        map(ont => {
          this.spinner.hide();
          return ont
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  duplicateOntology(ontology, ontologyId: string) {
    this.spinner.show();
    ontologyId = encodeURIComponent(ontologyId);
    ontologyId = encodeURIComponent(ontologyId);
    const url = `${this.baseUrl}ontology/duplicate/${ontologyId}`;
    return this.http.post<{[k: string]: any}>(url, ontology, httpOptions)
      .pipe(
        map(ont => {
          this.spinner.hide();
          return ont;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  mergeOntologies(ontology, ontologyId: string, ontology2Id: string) {
    this.spinner.show();
    ontologyId = encodeURIComponent(ontologyId);
    ontologyId = encodeURIComponent(ontologyId);
    ontology2Id = encodeURIComponent(ontology2Id);
    ontology2Id = encodeURIComponent(ontology2Id);
    const url = `${this.baseUrl}ontology/merge/${ontologyId}/${ontology2Id}`;
    return this.http.post<{[k: string]: any}>(url, ontology, httpOptions)
      .pipe(
        map(ont => {
          this.spinner.hide();
          return ont;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  setItem(item: {[k: string]: any}, ontologyId: string, ternary?) {
    this.spinner.show();
    ontologyId = encodeURIComponent(ontologyId);
    ontologyId = encodeURIComponent(ontologyId);
    let url = `${this.baseUrl}item/${ontologyId}`;
    if(ternary) {
      url += '?ternary=true';
    }
    return this.http.post<{[k: string]: any}>(url, item, httpOptions)
      .pipe(
        map(data => {
          // data.label = INFO.labels[data.type];
          // this._setInfo(data);
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  getOntologyEntities(id: string) {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}/entities`;
    return this.http.get<{[k: string]: any}>(url)
      .pipe(
        map(entities => {
          this.spinner.hide();
          return entities
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  _extract(data, url, resolve) {
    const { id, namedEntityExtractionId, termExtractionId } = data;
    const params = new HttpParams()
        .set('id', id)
        .set('namedEntityExtractionId', namedEntityExtractionId)
        .set('termExtractionId', termExtractionId);
    this.http.get(url, {headers: httpOptions.headers, params: params})
        .subscribe(data => {
          const res: {[k: string]: any} = data;
          if(res.status==='wait') {
            setTimeout(() => {
              this._extract(res, url, resolve);
            }, 5000)
          } else {
            this.spinner.hide();
            resolve(res);
          }
        });
  }

  terminologyExtraction(params) {
    this.spinner.show();
    const p = new Promise((resolve, reject) => {
      const url = `${this.baseUrl}terminology-extraction`;
      const ob = this.http.post<{[k: string]: any}>(url, params, httpOptions)
        .pipe(
          map(data => data),
          tap(
            data => console.log(data),
            error => console.log(error)
          ),
          catchError(this.handleError)
        );
      ob.subscribe(data => {
        this._extract(data, url, resolve);
      })
    });
    return p;
  }

  _extract2(courseUuid, url, resolve) {
    const params = new HttpParams()
      .set('courseUuid', courseUuid);
    this.http.get(url, {headers: httpOptions.headers, params: params})
        .subscribe(data => {
          const res: {[k: string]: any} = data;
          if(res.status==='wait') {
            setTimeout(() => {
              this._extract2(courseUuid, url, resolve);
            }, 5000)
          } else {
            this.spinner.hide();
            resolve(res);
          }
        });
  }

  terminologyExtractionCourses(params) {
    return new Promise((resolve, reject) => {
      this.spinner.show();
      const url = `${this.baseUrl}terminology-extraction-courses`;
      this._extract2(params.courseUuid, url, resolve);
    });
  }

  addTerms(id, params) {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}/terminology`;
    return this.http.post<{[k: string]: any}>(url, params, httpOptions)
      .pipe(
        map(ontology => {
          this.spinner.hide();
          return this._parseOntology(ontology);
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  search(s: string) {
    // let params = new HttpParams()
    //   .set('s', s);
    s = encodeURIComponent(s);
    const url = `${this.baseUrl}autocomplete/${s}`;
    return this.http.get<{[k: string]: any}[]>(url, httpOptions)
    // return this.http.get<{[k: string]: any}>(url, {headers: httpOptions.headers, params: params})
      .pipe(
        map(data => {
          if(!Array.isArray(data))
            data = [data];
          // return data.map( (el, ind) => {
          //   return {id: ind, name: el};
          // } )
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );

  }

  relation(id: string, s: string) {
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    s = encodeURIComponent(s);
    const url = `${this.baseUrl}autocompleteRelation/${id}/${s}`;
    return this.http.get<{[k: string]: any}[]>(url, httpOptions)
    // return this.http.get<{[k: string]: any}>(url, {headers: httpOptions.headers, params: params})
      .pipe(
        map(data => {
          if(!Array.isArray(data))
            data = [data];
          // return data.map( (el, ind) => {
          //   return {id: ind, name: el};
          // } )
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  fieldOpenList(id: string, s: string) {
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    s = encodeURIComponent(s);
    const url = `${this.baseUrl}autocompleteOpenField/${id}/${s}`;
    return this.http.get<{[k: string]: any}[]>(url, httpOptions)
    // return this.http.get<{[k: string]: any}>(url, {headers: httpOptions.headers, params: params})
      .pipe(
        map(data => {
          if(!Array.isArray(data))
            data = [data];
          // return data.map( (el, ind) => {
          //   return {id: ind, name: el};
          // } )
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  fieldInternalLink(s: string) {
    s = encodeURIComponent(s);
    const url = `${this.baseUrl}autocompleteInternalLink/${s}`;
    return this.http.get<{[k: string]: any}[]>(url, httpOptions)
    // return this.http.get<{[k: string]: any}>(url, {headers: httpOptions.headers, params: params})
      .pipe(
        map(data => {
          if(!Array.isArray(data))
            data = [data];
          // return data.map( (el, ind) => {
          //   return {id: ind, name: el};
          // } )
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  saveDataProperties(item: {[k: string]: any}[], ontologyId: string) {
    this.spinner.show();
    ontologyId = encodeURIComponent(ontologyId);
    ontologyId = encodeURIComponent(ontologyId);
    const url = `${this.baseUrl}dataProperties/${ontologyId}`;
    return this.http.post<{[k: string]: any}>(url, item, httpOptions)
      .pipe(
        map(data => {
          data.label = INFO.labels[data.type];
          // this._setInfo(data);
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  getOntologiesSimple(): Observable<{[k: string]: any}[]> {
    this.spinner.show();
    const url = `${this.baseUrl}ontologies/simple`;
    return this.http.get<Ontology[]>(url)
      .pipe(
        map(data => {
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );

    // return of(ONTOLOGIES);
  }

  getOntologyMap(id: string): Observable<{[k: string]: any}> {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}getOntologyGraph?uri=${id}`;
    return this.http.get<{[k: string]: any}>(url)
      .pipe(
        map(ontology => {
          this.spinner.hide(true);
          return ontology;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  private parseItems(items) {
    items.map(item => {
      item.label = INFO.labels[item.type];
      // this._setInfo(item);
    });
    console.log(items)
    return items;
  }

  searchItems(id: string, type: string, search?: {[k: string]: any}): Observable<any> {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    if(!search)
      search = {};
    if(!search.page)
      search.page = 1;
    if(!search.limit && search.limit!==0)
      search.limit = 10;
    if(!search.search)
      search.search = '';
    const url = `${this.baseUrl}search/${id}/${type}`;
    return this.http.post<any>(url, search, httpOptions)
      .pipe(
        map(data => {
          data.records = this.parseItems(data.records);
          data.searchApplied.search = search.search;
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  searchTerminologies(ontologyId: string, entityId: string, search?: {[k: string]: any}): Observable<any> {
    this.spinner.show();
    ontologyId = encodeURIComponent(ontologyId);
    ontologyId = encodeURIComponent(ontologyId);
    entityId = encodeURIComponent(entityId);
    entityId = encodeURIComponent(entityId);
    if(!search)
      search = {};
    if(!search.page)
      search.page = 1;
    if(!search.limit)
      search.limit = 10;
    if(!search.search)
      search.search = '';
    const url = `${this.baseUrl}entity-terminologies/${ontologyId}/${entityId}`;
    return this.http.post<any>(url, search, httpOptions)
      .pipe(
        map(data => {
          // data.records = this.parseItems(data.records);
          data.searchApplied.search = search.search;
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  getEntity(entityId: string): Observable<any> {
    this.spinner.show();
    entityId = encodeURIComponent(entityId);
    entityId = encodeURIComponent(entityId);
    const url = `${this.baseUrl}entity-properties/${entityId}`;
    return this.http.get<any>(url)
      .pipe(
        map(data => {
          // data.records = this.parseItems(data.records);
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  getTerminology(terminologyId: string): Observable<any> {
    this.spinner.show();
    terminologyId = encodeURIComponent(terminologyId);
    terminologyId = encodeURIComponent(terminologyId);
    const url = `${this.baseUrl}terminology-properties/${terminologyId}`;
    return this.http.get<any>(url)
      .pipe(
        map(data => {
          // data.records = this.parseItems(data.records);
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  saveItem(item: {[k: string]: any}): Observable<any> {
    this.spinner.show();
    const url = `${this.baseUrl}save-item`;
    return of(item);
    // return this.http.post<any>(url, item, httpOptions)
    //   .pipe(
    //     map(data => {
    //       debugger
    //       this.spinner.hide();
    //       return data;
    //     }),
    //     tap(
    //       data => console.log(data),
    //       error => console.log(error)
    //     ),
    //     catchError(this.handleError)
    //   );
  }

  getGraph(id: string, type: string): Observable<string> {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}${type}-graph/${id}`;
    return this.http.get<string>(url)
      .pipe(
        map(graph => {
          this.spinner.hide(true);
          return graph;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  publishOntology(id) {
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}/publish`;
    return this.http.post<{[k: string]: any}>(url, true, httpOptions)
      .pipe(
        map(data => data),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  deleteEntityContents(ontologyId, entityId) {
    ontologyId = encodeURIComponent(ontologyId);
    ontologyId = encodeURIComponent(ontologyId);
    entityId = encodeURIComponent(entityId);
    entityId = encodeURIComponent(entityId);
    const url = `${this.baseUrl}entityContents/${ontologyId}/${entityId}`;
    return this.http.delete<any>(url)
      .pipe(
        map(data => {
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  getUri(id, name, type) {
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}getUri/${id}/${type}`;
    return this.http.get<{[k: string]: any}>(url, {headers: httpOptions.headers, params: {text: name}})
      .pipe(
        map(data => {
          this.spinner.hide(true);
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  getOntologyProperties(id, type) {
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}ontology/${id}/${type}`;
    return this.http.get<{[k: string]: any}>(url)
      .pipe(
        map(data => {
          this.spinner.hide(true);
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an ErrorObservable with a user-facing error message
    return throwError(error);
  };

  entities(id: string, s: string) {
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    s = encodeURIComponent(s);
    const url = `${this.baseUrl}autocompleteEntities/${id}/${s}`;
    return this.http.get<{[k: string]: any}[]>(url, httpOptions)
    // return this.http.get<{[k: string]: any}>(url, {headers: httpOptions.headers, params: params})
      .pipe(
        map(data => {
          if(!Array.isArray(data))
            data = [data];
          // return data.map( (el, ind) => {
          //   return {id: ind, name: el};
          // } )
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  canEditProperties(id): Observable<boolean> {
    if(!id) {
      return of(true);
    }
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    const url = `${this.baseUrl}canEdit/${id}`;
    return this.http.get<boolean>(url, httpOptions)
      .pipe(
        map((data: {[k: string]: any}) => {
          return data.canEdit;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  externalRecord(s: string) {
    s = encodeURIComponent(s);
    const url = `${this.baseUrl}getExternalRecord/${s}`;
    return this.http.get<{[k: string]: any}[]>(url, httpOptions)
      .pipe(
        map(data => {
          if(!Array.isArray(data))
            data = [data];
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  downloadOntology(ontologyId: string, model?: boolean) {
    ontologyId = encodeURIComponent(ontologyId);
    let url = `${this.baseUrl}export?id=${ontologyId}`;
    if(model) {
      url += '&model=true';
    }
    window.open(url, "_blank");
  }

  getDeletingInfo(ontologyId, entityId): Promise<string> {
    return new Promise((resolve, reject) => {
      this.spinner.show();
      ontologyId = encodeURIComponent(ontologyId);
      ontologyId = encodeURIComponent(ontologyId);
      entityId = encodeURIComponent(entityId);
      entityId = encodeURIComponent(entityId);
      const url = `${this.baseUrl}deletingInfo/${ontologyId}/${entityId}`;
      this.http.get<string>(url)
        .pipe(
          map(data => {
            return data;
          }),
          tap(
            data => console.log(data),
            error => console.log(error)
          ),
          catchError(this.handleError)
        ).subscribe(
          info => {
            this.spinner.hide();
            resolve(info);
          },
          err => {
            this.spinner.hide();
            reject(err);
          }
        );
    })
  }

  _import(file, ontologyId?): Observable<string> {
    this.spinner.show();
    let url = `${this.baseUrl}import?file=${file}`;
    if(ontologyId)
      url += `&ontologyId=${ontologyId}`;
    return this.http.get<string>(url)
      .pipe(
        map(ont => {
          this.spinner.hide();
          return ont
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

  searchSolr(id, search?) {
    this.spinner.show();
    id = encodeURIComponent(id);
    id = encodeURIComponent(id);
    if(!search)
      search = {};
    if(!search.page)
      search.page = 1;
    if(!search.limit && search.limit!==0)
      search.limit = 10;
    if(!search.search)
      search.search = '*';
    const url = `${this.baseUrl}searchSolr/terminologies/${id}`;
    return this.http.post<any>(url, search, httpOptions)
      .pipe(
        map(data => {
          data.records = [];
          data.results.forEach(res => {
            data.records.push({
              id: res.id,
              name: {
                [this.lang]: res.name_s
              },
              lastModified: res.lastModified_s,
              uri: res.uri_s,
              entity: res.entity_s,
              superclass: {value: res.entityId_s},
              type: 'terminology'
            });
          });
          this.parseItems(data.records);
          data.searchApplied.search = search.search;
          this.spinner.hide();
          return data;
        }),
        tap(
          data => console.log(data),
          error => console.log(error)
        ),
        catchError(this.handleError)
      );
  }

}
