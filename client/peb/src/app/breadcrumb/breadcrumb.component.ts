import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';

import { environment } from './../../environments/environment';
import { Ontology } from '../ontology';
import { RouterService } from '../router.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit {
  @Input() title: string;
  @Input() ontology: Ontology;
  @Input() items;
  @Output() onFocus = new EventEmitter<any>();
  @Output() onBlur = new EventEmitter<any>();
  @Output() onTitleClick = new EventEmitter<void>();

  lang: string = environment.lang;
  appId: string = environment.id;
  
  constructor(
    private routerService: RouterService
  ) { }

  ngOnInit() {console.log(this.items)
  }

  focus(name, type) {
    this.onFocus.emit({ type, val: name });
  }

  blur(name, type) {
    this.onBlur.emit({ type, val: name });
  }

  titleClick() {
    this.onTitleClick.emit();
  }

  goTo({url, params}) {
    this.routerService.goTo(url, params);
  }

}
