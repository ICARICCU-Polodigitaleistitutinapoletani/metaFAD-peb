import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  @Input() info: { [key: string]: any };
  @Input() ontology: { [key: string]: any };
  @Input() activeItem: { [key: string]: any };
  @Input() type: string;
  @Input() activeTab: string;
  @Input() onTabChange: any;
  @Output() onViewChange = new EventEmitter<string>();
  @Output() onAddItem = new EventEmitter<string>();
  @Output() onOpenMetaSemNet = new EventEmitter<any>();

  view: string;
  lang: string = environment.lang;
  appId = environment.id;
  label: string;
  isOpen: boolean;
  private subscriptions: Subscription[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ref: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.view = 'list';
    if(this.info.features.links && this.info.features.links.knowledgeGraph) {
      this.info.features.links.knowledgeGraph._url = this.info.features.links.knowledgeGraph.url.replace('##ontologyId##', this.ontology.id);
    }
    this.label = this.type === 'entities' ? 'Entità' : 'Tipologie di contenuto';
    if(this.activeTab === 'relations') {
      this.label = 'Relazioni';
    }

    if(this.onTabChange) {
      this.subscriptions.push(this.onTabChange.subscribe(tab => {
        this.setView('list');
        this.activeTab = tab;
        this.label = this.activeTab === 'entities' ? 'Entità' : 'Relazioni';
      }))
    }
  }

  setView(view) {
    if(view === this.view)
      return;
    this.view = view;
    this.onViewChange.emit(view);
  }

  goToExtraction() {
    const baseUrl = window['BASE_ROUTING'] || '';
    this.router.navigate([baseUrl+'/extraction', encodeURIComponent(this.ontology.id)])
  }

  addItem(item, fromTopOntology?, ternary?) {
    if(fromTopOntology || ternary)
      return;
    this.onAddItem.emit(item);
    // this.ref.detectChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
