import { Component, OnInit, ViewChild, ElementRef, Input, HostListener, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-metasemnet',
  templateUrl: './metasemnet.component.html',
  styleUrls: ['./metasemnet.component.scss']
})
export class MetasemnetComponent implements OnInit {
  
  @ViewChild('metaSemNetIframe') iframe: ElementRef;
  @Input() path;
  @Input() onOpen;
  @Output() onClose = new EventEmitter<any>();

  private subscriptions = [];
  show: boolean;
  doc;
  items: {[key: string]: any}[];

  constructor() { }

  ngOnInit() {
    this.subscriptions.push(
      this.onOpen.subscribe(items => {
        this.items = items;
        console.log(items);
        this.show = true;
        let event = {
          type: 'semanticTool.getLabels.response', 
          message: this.items
        };
        this.doc.postMessage(event, '*');
      })
    );
    
  }

  onLoad() {
    this.doc = this.iframe.nativeElement.contentWindow;
  }

  @HostListener('window:message', ['$event']) onPostMessage(event) {
    let data = event.data;
    console.log(data)
    switch(data.type) {
      case 'semanticTool.closeIFrame':
        this.show = false;
        this.onClose.emit();
        break;
      case 'semanticTool.getLabels':
        let evt = {
          type: 'semanticTool.getLabels.response', 
          message: this.items
        };
        this.doc.postMessage(evt, '*');
        break;
      case 'semanticTool.setTextFromSelection':
        this.show = false;
        this.onClose.emit(data.message);
        break;
    }
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
