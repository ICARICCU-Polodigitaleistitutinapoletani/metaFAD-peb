import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';

import { environment } from './../../environments/environment';
import { Ontology } from '../ontology';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
  @Input() ontology: Ontology;
  @Input() type: string;
  @Input() text: string;
  @Input() item: { [key: string]: any };
  @Input() activeItem: { [key: string]: any };
  @Input() superclass: { [key: string]: any };
  @Input() info: { [key: string]: any };
  @Input() viewType: string;
  @Input() index;
  @Output() onShare = new EventEmitter<Ontology>();
  @Output() onEdit = new EventEmitter<{ [key: string]: any }>();
  @Output() onDelete = new EventEmitter<{ [key: string]: any }>();
  @Output() onSelectItem = new EventEmitter<{ [key: string]: any }>();
  @Output() onDeleteItem = new EventEmitter<{ [key: string]: any }>();
  @Output() onAdd = new EventEmitter<{ [key: string]: any }>();
  @Output() onEditEntity = new EventEmitter<{ [key: string]: any }>();
  @Output() onEditTerminology = new EventEmitter<{ [key: string]: any }>();
  @Output() onPublish = new EventEmitter<Ontology>();
  @Output() onAddItem = new EventEmitter<string>();
  @Output() onDeleteContents = new EventEmitter<{ [key: string]: any }>();
  @Output() onCreateReverse = new EventEmitter<{ [key: string]: any }>();
  @Output() onDownload = new EventEmitter<string>();
  @Output() onUpload = new EventEmitter<string>();

  lang: string = environment.lang;
  objectKeys = Object.keys;
  appId = environment.id;

  constructor(
    
  ) { }

  ngOnInit() {
    
  }

  share() {
    this.onShare.emit(this.ontology);
  }

  edit(type) {
    let event = { type };
    if(this.ontology)
      event['ontology'] = this.ontology;
    this.onEdit.emit(event);
  }

  delete(content?) {
    this.onDelete.emit(this.ontology);
  }

  delete2(content?) {
    this.onDelete.emit({ontology: this.ontology, content});
  }

  selectItem() {
    const selectItem = JSON.parse(JSON.stringify(this.item))
    this.onSelectItem.emit(selectItem);
    if(this.appId == 'metafad' && this.viewType == 'terminologies' && this.item.type == 'entity') {
      this.edit('terminologies');
    }
  }

  deleteItem() {
    this.onDeleteItem.emit(this.item);
  }

  add(_import?) {
    this.onAdd.emit(_import);
  }

  publish() {
    this.onPublish.emit(this.ontology);
  }

  addTerminology() {
    setTimeout(() => {
      this.onAddItem.emit('terminology');
    }, 50);
  }

}
