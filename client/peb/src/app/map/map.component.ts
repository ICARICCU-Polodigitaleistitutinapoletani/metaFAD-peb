import { Component, OnInit, ViewChild, ElementRef, Input, HostListener, Output, EventEmitter } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  @ViewChild('mapIframe') iframe: ElementRef;
  @Input() map: { [key: string]: any };
  @Input() ontologyName: string;
  @Output() onClickNode = new EventEmitter<{ [key: string]: any }>();
  viewerPath;

  constructor(
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    const graphPath = window['GRAPH_PATH'] || '';
    this.viewerPath = this.sanitizer.bypassSecurityTrustResourceUrl(graphPath+'assets/webvowl/index.html');
  }

  ngAfterViewInit() {

  }

  onLoad() {
    let doc =  /*this.iframe.nativeElement.contentDocument || */this.iframe.nativeElement.contentWindow;
    let event = {
      type: 'loadMap',
      data: this.map,
      ontologyName: this.ontologyName
    };
    doc.postMessage(event, '*');
  }

  @HostListener('window:message', ['$event']) onPostMessage(event) {
    this.onClickNode.emit(event);
  }
}
