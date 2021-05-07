import { Component, OnInit, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router, RouterEvent, NavigationEnd } from '@angular/router';

import { Ontology } from '../ontology';
import { OntologyService } from '../ontology.service';
import { RouterService } from '../router.service';
import { BootstrapService } from '../bootstrap/bootstrap.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-manage',
  templateUrl: './manage.component.html',
  styleUrls: ['./manage.component.scss']
})
export class ManageComponent implements OnInit {

  info: { [key: string]: any };
  ontologies: Ontology[];
  emptyOntology: Ontology = {
    id: null,
    name: {
      'it': 'Nuova Ontologia'
    },
    lastModified: '',
    shared: false,
    entities: 0,
    terminology: 0,
    contents: 0,
    imported: [],
    items: [],
    dataProperties: []
  };
  type: string;
  appId = environment.id;
  headers;
  subscriptions = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private routerService: RouterService,
    private ontologyService: OntologyService,
    private bootstrapService: BootstrapService
  ) {
    this.subscriptions.push(
      router.events.subscribe((event: RouterEvent) => {
        if (event instanceof NavigationEnd) {
          if(event.url === '/manage')
            this.type = null;
        }
      })
    )
  }

  ngOnInit() {
    this.headers = [{
      label: environment.title,
      route: {
        url: 'manage'
      }
    }];
    if(this.route.firstChild) {
      this.type = this.route.firstChild.snapshot.params['type'];
      this.headers.push({
        label: this.type==='ontology' ? 'Gestione portali e ontologie' : 'Gestione contenuti',
        // route: {
        //   url: 'manage',
        //   params: [this.type]
        // }
      })
    }
    this.getInfo();
    this.getOntologies();
  }

  getInfo() {
    this.info = this.route.snapshot.data['info'];
    // this.ontologyService.getInfo()
    //   .subscribe(data => {debugger});
  }

  getOntologies(): void {
    this.ontologyService.getOntologies()
        .subscribe(ontologies => this.ontologies = ontologies);
  }

  onShare(ontology: Ontology) {
    if(ontology.shared) {
      this.ontologyService.shareOntology(ontology.id, false)
          .subscribe(ont => {ontology.shared = false});
    } else {
      this.routerService.goTo('share', [ontology.id]);
    }
  }

  onEdit(card) {
    this.routerService.goTo('edit', [card.ontology.id, card.type]);
  }

  onDelete(ontology: Ontology) {
    const em = new EventEmitter<string>();
    em.subscribe( id => {
      if(id === 'confirm') {
        this.ontologyService.deleteOntology(ontology.id)
          .subscribe(() => {
            const index = this.ontologies.map(o => o.id).indexOf(ontology.id);
            this.ontologies.splice(index, 1);
            this.bootstrapService.closeModal() 
          });
      } else {
        this.bootstrapService.closeModal(); 
      }
    });
    const modalConfig = {
      msg: 'Confermi la cancellazione dell\'ontologia?',
      buttons: [{
        id: 'cancel',
        type: 'cancel',
        // label: 'Annulla',
        // class: 'btn-default',
        onClick: em
      }, {
        id: 'confirm',
        type: 'confirm',
        // label: 'Conferma',
        // class: 'btn-primary',
        onClick: em
      }]
    }
    this.bootstrapService.openModal({}, modalConfig)
    
  }

  createOntology() {
    this.routerService.goTo('new');
  }

  setType(type) {
    this.type = type;
    this.headers = [{
      label: environment.title,
      route: {
        url: 'manage'
      }
    }, {
      label: this.type==='ontology' ? 'Gestione portali e ontologie' : 'Gestione contenuti',
    }];
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
