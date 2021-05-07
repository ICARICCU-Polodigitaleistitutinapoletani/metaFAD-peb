import { Component, OnInit, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent implements OnInit {

  @Input() current: number;
  @Input() 
    set pages(pages: number) {
      this._pages = pages;
      this._init();
    }
  @Input() change: EventEmitter<number>;

  @Output() onChange = new EventEmitter<{ [key: string]: any }[]>();

  pagesArray: { [key: string]: any }[];
  _pages: number;
  private subscriptions = [];

  constructor() { }

  ngOnInit() {
    this.subscriptions.push(this.change.subscribe(pageIndex => this.changePage(pageIndex)));
  }

  _init() {
    this.pagesArray = [];
    if(this._pages<4) {
      for (let index = 0; index < this._pages; index++) {
        this._addPage(index, null);
      }
    } else {
      if(this.current===0 || this.current===1) {
        this._addPage(0, null);
        this._addPage(1, null);
        this._addPage(2, null);
        this._addPage(3, '...', 'next');
      } else if(this.current===this._pages-1 || this.current===this._pages-2) {
        this._addPage(this._pages-4, '...', 'prev');
        this._addPage(this._pages-3, null);
        this._addPage(this._pages-2, null);
        this._addPage(this._pages-1, null);
      } else {
        this._addPage(this.current-2, '...', 'prev');
        this._addPage(this.current-1, null);
        this._addPage(this.current, null);
        this._addPage(this.current+1, null);
        this._addPage(this.current+2, '...', 'next');
      }
    }
    console.log(this.pagesArray)
  }

  _addPage(ind, label, dir?) {
    this.pagesArray.push({
      index: ind,
      label: label || ind+1,
      dir
    })
  }

  changePage(pageIndex, disable?, dir?) {
    if(dir) {
      if(dir === 'next') {
        pageIndex = pageIndex+5 > this._pages ? this._pages-1 : pageIndex+5;
      } else {
        pageIndex = pageIndex-5 < 0 ? 0 : pageIndex-5;
      }
    }
    if(disable)
      return;
    this.current = pageIndex;
    this._init();
    this.onChange.emit(pageIndex+1);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
  }

}
