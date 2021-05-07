import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss']
})
export class DropdownComponent implements OnInit {
  @Input() type: string;
  @Input() item: { [key: string]: any };
  @Input() title: string;
  @Input() model: string;
  @Input() opts: object[];
  @Input() filter: string;
  @Input() allowBlank: boolean;
  @Input() selected: { [key: string]: any };
  @Input() superclass: { [key: string]: any }[];
  @Input() filterIds: string[];
  @Input() disabled: boolean;
  @Input() label: string;
  @Input() top: string;
  @Input() hideSelf: boolean;
  @Input() enableFilter: boolean;
  @Output() onSelectOpt = new EventEmitter<{ [key: string]: any }>();

  selectedOpt: { [key: string]: any } = {};
  status: { isopen: boolean } = { isopen: false };
  filterText: string;

  constructor() { }

  ngOnInit() {
    if(this.filterIds && this.hideSelf) {
      this.filterIds.push(this.item.id);
    }
    //this.allowBlank = true;
    console.log(this.filterIds, this.item)
  }
 
  change(value: boolean): void {
    this.status.isopen = value;
    if(!value)
      this.selectedOpt = {};
  }

  selectOpt(opt) {
    let o;
    if(opt && opt.id) {
      o = JSON.parse(JSON.stringify(opt))
      delete o.values;
    }
    this.onSelectOpt.emit({opt: o, item: this.item});
    this.status.isopen = false;
    this.selectedOpt = {};
    this.filterText = '';
  }

  selectPrimary($event, opt) {
    let o = JSON.parse(JSON.stringify(opt))
    $event.preventDefault();
    $event.stopPropagation();
    this.selectedOpt = o;
  }

  selectSecondary($event, val) {
    $event.preventDefault();
    $event.stopPropagation();
    this.selectedOpt.value = val;

    if(!this.selectedOpt.id.includes('standard'))
      this.selectOpt(this.selectedOpt);
  }

  selectTertiary($event, entity) {
    $event.preventDefault();
    $event.stopPropagation();
    this.selectedOpt.entity = entity;

    this.selectOpt(this.selectedOpt);
  }

  reset() {
    this.selectOpt(null);
  }

  back() {
    if(this.selectedOpt['value'])
      delete this.selectedOpt['value'];
    else if(this.selectedOpt['id'])
      delete this.selectedOpt['id'];
  }

  check(id) {
    if(id.indexOf(this.top)===0)
      return true;
  }

}
