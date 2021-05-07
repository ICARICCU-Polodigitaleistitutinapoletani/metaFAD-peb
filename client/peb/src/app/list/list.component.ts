import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';

import { OntologyService } from '../ontology.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {

  @Input() items: { [key: string]: any }[];
  @Input() superclass: { [key: string]: any };
  @Input() activeItem: { [key: string]: any };
  @Input() type: string;
  @Input() ontology: { [key: string]: any };
  @Output() onSearch = new EventEmitter<string>();
  @Output() onEditItem = new EventEmitter<{ [key: string]: any }>();
  @Output() onDeleteItem = new EventEmitter<{ [key: string]: any }>();
  @Output() onAddItem = new EventEmitter<string>();
  @Output() onDeleteContents = new EventEmitter<{ [key: string]: any }>();
  @Output() onCreateReverse = new EventEmitter<{ [key: string]: any }>();

  search: { [key: string]: any } = {
    term: ''
  };
  info: { [key: string]: any };

  constructor(
    private ontologyService: OntologyService,
  ) { }

  ngOnInit() {
    this.info = this.ontologyService.info;
  }

  edit(event, item) {
    this.onEditItem.emit({ ...event, id: item.id, item });
  }

}
