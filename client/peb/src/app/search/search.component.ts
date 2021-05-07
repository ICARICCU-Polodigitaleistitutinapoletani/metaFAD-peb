import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';

import { environment } from './../../environments/environment';
import { OntologyService } from '../ontology.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
  @Input() search: { [key: string]: any };
  @Input() types: string[];
  @Input() info: { [key: string]: any };
  @Input() entities: { [key: string]: any };
  @Output() onSearch = new EventEmitter<string>();
  @Output() onChange = new EventEmitter<string>();

  lang: string = environment.lang;
  txtQuery: string;
  txtQueryChanged: Subject<string> = new Subject<string>();
  
  constructor(
    private ontologyService: OntologyService,
  ) { 
    this.txtQueryChanged.pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe(model => this.onChange.emit(model));
  }

  ngOnInit() {
    
  }

  setType(type) {
    this.search.type = type;
    this.search.entity = '';
    this.search.entityLabel = '';
    // this.onSearch.emit(this.search);
  }

  setEntity(entity) {
    this.search.type = '';
    this.search.entity = entity.id;
    this.search.entityLabel = entity.type;
  }

  onFieldChange(query:string){
    this.txtQueryChanged.next(query);
  }

}
