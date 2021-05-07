import { Component, OnInit, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as $ from 'jquery';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from './../../environments/environment';
import { Ontology } from '../ontology';
import { OntologyService } from '../ontology.service';
import { ModalService } from '../modal.service';
import { ModalTemplateComponent } from '../modal-template/modal-template.component';
import { BootstrapService } from '../bootstrap/bootstrap.service';
import { SpinnerService } from '../spinner.service';
import { RouterService } from '../router.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-editv2',
  templateUrl: './editv2.component.html',
  styleUrls: ['./editv2.component.scss']
})
export class Editv2Component implements OnInit {

  lang: string = environment.lang;
  ontology: Ontology;
  info: { [key: string]: any };
  ontologyName: string;
  ontologyUri: string;
  type: string;
  items: {[key: string]: any}[];
  searchApplied: {[key: string]: any};
  map: { [key: string]: any };
  enableMap: boolean;
  pagination: { [key: string]: any } = {
    change: new EventEmitter<number>()
  }
  rightItems: {[key: string]: any}[];
  rightSearchApplied: {[key: string]: any};
  rightPagination: { [key: string]: any } = {
    change: new EventEmitter<number>()
  }
  selectedEntity: string;
  superclass: { [key: string]: any };
  activeItem: { [key: string]: any };
  selectedNode: { [key: string]: any };
  refresh = new EventEmitter<{ [key: string]: any }>();
  metaSemNetPath;
  onOpenMetaSemNet = new EventEmitter();
  appId = environment.id;
  headers;
  activeTab: string = 'entities';
  facets: any;
  selectedFacets: any = {};
  objectKeys = Object.keys; 
  private subscriptions: Subscription[] = [];
  facetsMap: any = {};
  visibleFacets: number = 20;
  onTabChange = new EventEmitter<string>();

  constructor(
    private ontologyService: OntologyService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService,
    private bootstrapService: BootstrapService,
    private spinner: SpinnerService,
    private routerService: RouterService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.type = this.route.snapshot.paramMap.get('type');
    this.info = this.route.snapshot.data['info'];
    const search = this.route.snapshot.data['search'];
    // search.records.map(item => {
    //   item.properties.push({
    //     order: item.properties.length+1
    //   });
    //   if(!item.name)
    //     item.name = {};
    // });
    this.setSearch(search);
    this.getOntology();
    // this.superclass = this.getSuperclass(this.items);
    this._getSuperclass(null, this.type).then(superclass => {
      this.superclass = superclass;
    });

    if(this.type === 'terminologies' && this.items.length) {
      this.onEditItem({type: 'terminologies', id: this.items[0].id});
    }
    if(this.info.features.links && this.info.features.links.metaSemNet) {
      this.metaSemNetPath = this.sanitizer.bypassSecurityTrustResourceUrl(this.info.features.links.metaSemNet.url);
    }

    if(this.appId === 'metafad') {
      this.setHeaders();
    }
    
    this.subscriptions.push(
      this.ontologyService.reloadSearch.subscribe(type => this.search(this.searchApplied, type)),
    );

    const terminologyId: string = this.route.snapshot.queryParamMap.get('terminologyId');
    // terminologyId = "be3c59cc-71ff-4f64-a3e2-912d9595e559#aab39fb0-6224-43b5-91d8-07802f1d27d1";
    if(this.type == 'terminologies' && terminologyId) {
      this.onEditRightItem({id: terminologyId})
    }
  }

  setHeaders() {
    const type = this.type==='entities' ? 'ontology' : 'content';
    this.headers = [{
      label: environment.title,
      // route: {
      //   url: 'manage'
      // }
    }, {
      label: type==='ontology' ? 'Gestione portali e ontologie' : 'Gestione contenuti',
      route: {
        url: 'manage',
        params: [type]
      }
    }, {
      label: 'Ontologia: '+this.ontology.name[this.lang]
    }];

  }

  setSearch(search) {
    this.items = search.records;
    this.searchApplied = search.searchApplied;
    this.pagination = { 
      ...this.pagination, 
      page: this.searchApplied.page,
      pages: Math.ceil(this.searchApplied.tot/this.searchApplied.limit)
    };

    this.items.forEach(item => {
      if(!item.name)
        item.name = {};
    });
  }

  getOntology(): void {
    this.ontology = this.route.snapshot.data['ontology'];


    // let ontology = this.route.snapshot.data['ontology'];
    // ontology.items.map(item => item.properties.push({
    //   order: item.properties.length+1
    // }));
    // this.ontology = ontology;
    // this.ontology.items.forEach(item => {
    //   if(!item.name)
    //     item.name = {};
    // });
    // this.superclass = this._getSuperclass(ontology);
    // console.log(this.superclass)
  }

  onNameFocus(obj) {
    const { type, val } = obj;
    if(type === 'name')
      this.ontologyName = val;
    else if(type === 'uri')
      this.ontologyUri = val;
  }

  onNameBlur(obj) {
    const { type, val } = obj;
    if(type === 'name' && val !== this.ontologyName) {
      this.ontologyService.updateOntologyName(this.ontology.id, {[this.lang]: val})
        .subscribe();
    } else if(type === 'uri' && val !== this.ontologyUri) {
      this.ontologyService.updateOntologyUri(this.ontology.id, val)
        .subscribe();
    }
  }

  goToList() {
    const baseUrl = window['BASE_ROUTING'] || '';
    this.routerService.goTo('manage');
    // this.router.navigate([baseUrl+'/manage'])
  }

  onViewChange(event) {
    if(event==='map') {
      this.ontologyService.getOntologyMap(this.ontology.id).subscribe(map => {
        this.map = map;
        this.enableMap = true;
      });
    } else if(event==='list') {
      this.enableMap = false;
    }
  }

  search(params, type) {
    this.ontologyService.searchItems(this.ontology.id, type, { ...params, fromTop: this.type!='terminologies' }).subscribe(search => {
      this.setSearch(search);
    });
  }

  onChangePage(page, type) {
    if(this.activeTab=='relations') {
      type = 'relations';
    }
    if(page === this.searchApplied.page)
      return;
    this.search({ ...this.searchApplied, page }, type);
  }

  onSearch(search, type) {
    this.search({ ...this.searchApplied, search, page: 1 }, type);
  }

  rightSearch(params?) {
    this.ontologyService.searchTerminologies(this.ontology.id, this.selectedEntity, params).subscribe(search => {
      this.activeItem = this.items.find(item => item.id == this.selectedEntity);
      this.setRightSearch(search);
    });
  }

  onChangeRightPage(page) {
    if(page === this.rightSearchApplied.page)
      return;
    this.rightSearch({ ...this.rightSearchApplied, page });
  }

  onRightSearch(search) {
    this.rightSearch({ ...this.rightSearchApplied, search, page: 1 });
  }

  setRightSearch(search) {
    this.rightItems = search.records;
    this.rightSearchApplied = search.searchApplied;
    this.rightPagination = { 
      ...this.rightPagination, 
      page: this.rightSearchApplied.page,
      pages: Math.ceil(this.rightSearchApplied.tot/this.rightSearchApplied.limit)
    };
    // if(!this.rightItems.length)
    //   this.addTerminology();
  }

  onEditItem(event) {
    if(event.type === 'entity') {
      this.ontologyService.getEntity(event.id).subscribe(data => {
        this.ontologyService.searchTerminologies(this.ontology.id, event.id).subscribe(search => {
          this.ontologyService.getGraph(event.id, 'entity').subscribe(graph => {
            this.editItem( { 
              ...event.item, 
              ...data, 
              terminologies: search.records, 
              searchApplied: search.searchApplied,
              pagination: {
                page: search.searchApplied.page,
                pages: Math.ceil(search.searchApplied.tot/search.searchApplied.limit),
                change: new EventEmitter<number>()
              },
              graph
            } );
          });
        });
      });
    } else if(event.type === 'terminologies' && event.id != this.selectedEntity) {
      this.selectedEntity = event.id;
      this.activeItem = this.items.find(item => item.id == this.selectedEntity);
      this.rightSearch();
    } else if(event.type === 'relation') {
      this.editRelation(event.item);

    }
  }

  onEditRightItem(event) {
    this.ontologyService.getTerminology(event.id).subscribe(data => {
      this.ontologyService.getGraph(event.id, 'terminology').subscribe(graph => {
        this.editItem({ ...data, graph, modal: event.modal });
      });
    }, err => {
      this.spinner.hide();
      const em = new EventEmitter<string>();
      em.subscribe( id => {
        // em.unsubscribe();
        this.bootstrapService.closeModal(); 
      });
      const modalConfig = {
        msg: err.status===404 ? 'Istanza non trovata' : 'Errore durante l\'apertura dell\'istanza',
        title: 'Attenzione',
        form: null,
        text: err.status===404 ? 'Istanza non trovata' : 'Errore durante l\'apertura dell\'istanza',
        buttons: [{
          id: 'ok',
          label: 'OK',
          class: 'btn-primary',
          onClick: em
        }],
        type: this.appId == 'metafad' ? 'v2' : ''
      }
      this.bootstrapService.openModal({class: 'alert'}, modalConfig);
    });
  }

  editTerminology(terminology) {
    this.ontologyService.getGraph(terminology.id, 'terminology').subscribe(graph => {
      this.editItem({ ...terminology, graph, readOnly: true });
    });
  }

  _getSuperclass(id?, type?) {
    return new Promise(resolve => {
      this.ontologyService.searchItems(id || this.ontology.id, 'entities', {limit: 99999, topEntities: true, fromTop: (type!='terminologies' && type!='terminology')}).subscribe(data => {
        let items = data.records;
        let superclass = {};
        items.forEach(item => {
          if(!item.name)
            item.name = {};
          superclass[item.id] = item;
        });
        resolve(superclass);
      })
    });
  }

  private editItem(activeItem, topDomain?) {
    if(!activeItem.properties) {
      activeItem.properties = [];
    }
    let last = activeItem.properties[activeItem.properties.length-1];
    if(!last || last.name || last.lang)
      activeItem.properties.push({
        order: activeItem.properties.length+1
      });
    if(!activeItem.labels) {
      activeItem.labels = [];
    }
    last = activeItem.labels[activeItem.labels.length-1];
    if(!last || last.name || last.lang)
      activeItem.labels.push({
        order: activeItem.labels.length+1
      });
    if(!activeItem.descriptions) {
      activeItem.descriptions = [];
    }
    last = activeItem.descriptions[activeItem.descriptions.length-1];
    if(!last || last.name || last.lang)
      activeItem.descriptions.push({
        order: activeItem.descriptions.length+1
      });
    const emDelete = new EventEmitter<{ [key: string]: any }>();
    emDelete.subscribe(item => {
      // em.unsubscribe();
      this.onDeleteItem(item, true);
    });
    const emSave = new EventEmitter<{ [key: string]: any }>();
    emSave.subscribe(item => {
      this.onSaveItem(item);
    });
    const emAdd = new EventEmitter<{ [key: string]: any }>();
    emAdd.subscribe(ontologyId => this.addTerminology(ontologyId));
    const emEdit = new EventEmitter<{ [key: string]: any }>();
    emEdit.subscribe(terminology => this.onEditRightItem({ ...terminology, modal: true }));
    const emMetaSemNet = new EventEmitter<any>();
    emMetaSemNet.subscribe(items => this.onOpenMetaSemNet.emit(items));

    const emClose = new EventEmitter<{ [key: string]: any }>();
    emClose.subscribe(data => {
      if(data) {
        if(data.field === 'newEntity') {
          this.addEntity(data.text);
        } else if(data.field === 'newTerminology') {
          this.addTerminology(null, data.text);
        }
      } else if(this.ontologyService.onSaveTerminology) {
        this.refresh.emit({type: 'update', ...this.ontologyService.onSaveTerminology});
        this.ontologyService.onSaveTerminology = null;
      }
    });
    if(activeItem.fromTopOntology) {
      topDomain = this.info.topDomain;
    }
    this._getSuperclass(topDomain, activeItem.type).then(superclass => {
      this.superclass = superclass;
      this.modalService.open(ModalTemplateComponent, { initialState: { 
        activeItem, 
        superclass: this.superclass, 
        info: this.info,
        ontology: this.ontology,
        onDelete: emDelete,
        onSave: emSave,
        onAdd: emAdd,
        onRefresh: this.refresh,
        onEdit: emEdit,
        onOpenMetaSemNet: emMetaSemNet,
        onClose: emClose,
        showDelete: activeItem.id && (activeItem.type=='terminology' || !this.ontology.published) && (activeItem.type!='terminology' || !activeItem.readOnly) ? true : false,
        hideSave: (activeItem.fromTopOntology && activeItem.id) || (activeItem.type!='terminology' && this.ontology.published) || (activeItem.type=='terminology' && activeItem.readOnly)
      } });
    });
  }

  private getSuperclass(items) {
    let superclass = {};
    items.map(item => {
      if(item.type === 'entity')
        superclass[item.id] = item;
    });
    return superclass;
  }

  private impossibleRemove() {
    const em = new EventEmitter<string>();
    em.subscribe( id => {
      // em.unsubscribe();
      this.bootstrapService.closeModal(); 
    });
    const modalConfig = {
      msg: 'Impossibile eliminare l\'entità in quanto risulta associata ad uno o più concetti.',
      title: 'Attenzione',
      form: null,
      text: 'Impossibile eliminare l\'entità in quanto risulta associata ad uno o più concetti.',
      buttons: [{
        id: 'ok',
        label: 'OK',
        class: 'btn-primary',
        onClick: em
      }],
      type: this.appId == 'metafad' ? 'v2' : ''
    }
    this.bootstrapService.openModal({class: 'alert'}, modalConfig);
  }

  async onDeleteItem(item, closeModal?) {
    if(item.type === 'entity' && item.terminologies > 0 && this.appId!='metafad') {
      this.impossibleRemove();
      return;
    }
    const { id, type } = item;
    if(id) {
      const em = new EventEmitter<string>();
      em.subscribe( _id => {
        // em.unsubscribe();
        if(_id === 'confirm' || _id.id === 'confirm') {
          this.ontologyService.deleteItem(id, type, this.ontology.id).subscribe(() => {
            if(type === 'entity') {
              this.search(this.searchApplied, 'entities');
              if(id == this.activeItem.id) {
                this.activeItem = null;
                this.rightItems = null;
              }
            } else if(type === 'terminology') {
              if(this.activeTab==='search') {
                this.solrSearch({ ...this.searchApplied, page: 1 });
              } else {
                this.ontologyService.searchItems(this.ontology.id, 'entities', { ...this.searchApplied, fromTop: false }).subscribe(search => {
                  this.setSearch(search);
                  this.rightSearch(this.rightSearchApplied);

                  if(item.modal) {
                    this.refreshModal(item.superclass.value);
                  }
                });
              }
            } else if(type === 'relation') {
              this.search(this.searchApplied, 'relations');
            }
            if(this.activeItem && this.activeItem.id===id)
              this.activeItem = null;

            if(closeModal)
              this.modalService.closeCurrent();
          }, err => {
            this.spinner.hide();
            if(err.status === 500) {
              this.impossibleRemove();
            }
          });
        }
        this.bootstrapService.closeModal(); 
      });
      let text = 'Sicuro di voler rimuovere l\'elemento?';
      if(item.type === 'entity') {
        text = await this.ontologyService.getDeletingInfo(this.ontology.id, id).catch(() => 'La rimozione dell\'entità comporta la rimozione di tutte le sue istanze.<br>Sei sicuro di voler proseguire?');
        text = text || 'La rimozione dell\'entità comporta la <b>rimozione</b> di tutte le sue istanze.<br>Sei sicuro di voler proseguire?';
      } else if(item.type === 'relation') {
        text = 'Sei sicuro di voler cancellare definitivamente la relazione selezionata?';
      } else if(item.type === 'terminology') {
        text = 'Sei sicuro di voler cancellare definitivamente il contenuto selezionato?';
      }
      const modalConfig = {
        msg: 'Sicuro di voler rimuovere l\'elemento?',
        title: 'Attenzione',
        form: null,
        text,
        buttons: [{
          id: 'cancel',
          type: 'cancel',
          // label: 'Annulla',
          // class: 'btn-default',
          onClick: em
        }, {
          id: 'confirm',
          label: 'Ok',
          class: 'btn-primary',
          onClick: em
        }],
        type: this.appId == 'metafad' ? 'v2' : ''
      }
      this.bootstrapService.openModal({class: 'alert nested modal-lg'}, modalConfig); 
    } else {
      this.activeItem = null;
    }
  }

  onSaveItem(data) {
    if(data.item.type === 'entity') {
      // if(data.new) {
        this.search(this.searchApplied, 'entities');
      // } else {
      //   const index = this.items.map(item => item.id).indexOf(data.item.id);
      //   const p = 
      //   data.item.properties = data.item.properties.filter(p => p.type === 'property').length;
      //   data.item.terminologies = data.item.terminologies.length;
      //   this.items.splice(index, 1, data.item);
      // }
      if(data.new) {
        this._getSuperclass(null, 'entity').then(superclass => {
          this.superclass = superclass;
          if(data.item.fromTopOntology) {
            this.modalService.closeCurrent();
          }
        });
      }
    }/* else if(data.new) {
      this.rightSearch(this.rightSearchApplied);
    } else {
      const index = this.rightItems.map(item => item.id).indexOf(data.item.id);
      this.rightItems.splice(index, 1, data.item);
    }*/
    else if(this.activeTab==='search') {
      this.solrSearch(this.searchApplied);
    } else {
      this.ontologyService.searchItems(this.ontology.id, 'entities', { ...this.searchApplied, fromTop: this.type!='terminologies' }).subscribe(search => {
        this.setSearch(search);
        if(this.rightSearchApplied) {
          this.rightSearch(this.rightSearchApplied);
        }

        if(data.item.modal) {
          this.refreshModal(data.item.superclass.value);
        }

      });
    }
    if(this.enableMap) {
      this.ontologyService.getOntologyMap(this.ontology.id).subscribe(map => {
        this.map = map;
        if(this.selectedNode)
          this.onClickNode({data: {id: this.selectedNode.id}});
      });
    }
  }

  private refreshModal(entityId) {
    this.ontologyService.searchTerminologies(this.ontology.id, entityId).subscribe(search => {
      this.ontologyService.getGraph(entityId, 'entity').subscribe(graph => {
        this.refresh.emit({
          terminologies: search.records, 
          searchApplied: search.searchApplied,
          pagination: {
            page: search.searchApplied.page,
            pages: Math.ceil(search.searchApplied.tot/search.searchApplied.limit),
            change: new EventEmitter<number>()
          },
          graph,
          type: 'data'
        });
      });
    });
  }

  onAddItem(_type) {
    let type;
    let fromHeader;
    if (typeof _type === 'string' || _type instanceof String) {
      type = _type;
    } else {
      type = _type.type;
      fromHeader = _type.fromHeader;
    }
    if(type === 'entity') {
      this.addEntity();
    } else if(type === 'terminology') {
      this.addTerminology(null, null, fromHeader);
    } else if(type === 'relation') {
      this.addRelation();
    } else if(type === 'topEntity') {
      this.addEntity(null, this.info.topDomain);
    }
  }

  addEntity(name?, topDomain?) {
    let item = {
      type: 'entity',
      name: {},
      properties: [],
      labels: [],
      descriptions: [],
      uri: ''
    };
    //this.activeItem.properties.push();
    item.name[this.lang] = name || '';
    if(topDomain) {
      item['fromTopOntology'] = true;
    }
    this.editItem( { 
      ...item,
      terminologies: [], 
      searchApplied: {},
      pagination: {}
    }, topDomain );
  }

  addTerminology(ontologyId?, name?, fromHeader?, fromTopOntology?) {
    if(fromTopOntology)
      return;
    let item = {
      type: 'terminology',
      name: {},
      properties: [],
      superclass: {
        value: ontologyId || (this.activeItem ? this.activeItem.id : Object.keys(this.superclass)[0])
      },
      modal: ontologyId ? true : false
    };
    if(!fromHeader) {
      item['disableType'] = true;
    }
    item.name[this.lang] = '';
    this.editItem(item);
  }

  check(activeItem) {
    if(!activeItem.labels) {
      activeItem.labels = [];
    }
    let last = activeItem.labels[activeItem.labels.length-1];
    if(!last || last.name || last.lang)
      activeItem.labels.push({
        order: activeItem.labels.length+1
      });

    if(!activeItem.descriptions) {
      activeItem.descriptions = [];
    }
    last = activeItem.descriptions[activeItem.descriptions.length-1];
    if(!last || last.name || last.lang)
      activeItem.descriptions.push({
        order: activeItem.descriptions.length+1
      });
    return activeItem;
  }

  addRelation(data?) {
    if(!data) {
      data = {};
    }
    let activeItem = {
      type: 'relation',
      name: {
        [this.lang]: ''
      },
      mandatory: false,
      multivalue: true,
    };
    activeItem = { ...activeItem, ...data };
    this.editRelation(activeItem);
  }

  editRelation(activeItem) {
    activeItem.properties = [];
    this.check(activeItem);
    const emSave = new EventEmitter<{ [key: string]: any }>();
    emSave.subscribe(item => {
      this.modalService.closeCurrent();
      delete item.properties;
      item = this.clean(item);
      this.ontologyService.searchItems(this.ontology.id, this.activeTab, this.searchApplied).subscribe(data => {
        this.setSearch(data);
      });
    });
    const emClose = new EventEmitter<{ [key: string]: any }>();
    emClose.subscribe(data => {
      
    });


    this.ontologyService.canEditProperties(activeItem.id).subscribe(canEdit => {
      this.ontologyService.getOntologyProperties(this.ontology.id, 'relation').subscribe(relations => {
        if(activeItem.id) {
          const currentRel = relations.find(r => r.id == activeItem.id);
          if(currentRel) {
            delete currentRel.descriptions;
            delete currentRel.labels;
            activeItem = { ...activeItem, ...currentRel };
          }
        }
        
        activeItem.readOnly = !canEdit;
        this.modalService.open(ModalTemplateComponent, { initialState: { 
          activeItem, 
          info: this.info,
          onSave: emSave,
          onClose: emClose,
          superclass: this.superclass,
          ontology: this.ontology,
          showDelete: activeItem.id && canEdit && !this.ontology.published,
          readOnly: !canEdit,
          relations,
          hideSave: this.ontology.published
        } });
      });
    });
  }

  private clean(el) {
    if(el.labels)
      el.labels = el.labels.filter(l => l.name);
    if(el.descriptions)
      el.descriptions = el.descriptions.filter(d => d.name);
    return el;
  }

  onClickNode(node) {
    // if(!this.items.find(item => item.id == node.data.id)) {
    //   this.selectedNode = null;
    //   return;
    // }
    let id = node.data.id;
    if(!this.superclass[id]) {
      let found;
      Object.keys(this.superclass).forEach(key => {
        if(!found && this.superclass[key].uri == id) {
          id = key;
          found = true;
        }
      });
      if(!found) {
        this.selectedNode = null;
        return;
      }
    }
    this.ontologyService.getEntity(id).subscribe(data => {
      const limit = Math.floor(($('app-map').height() - 134) / 50);
      this.ontologyService.searchTerminologies(this.ontology.id, id, { limit }).subscribe(search => {
        this.selectedNode = {
          ...data, 
          terminologies: search.records,
          searchApplied: search.searchApplied,
          pagination: {
            page: search.searchApplied.page,
            pages: Math.ceil(search.searchApplied.tot/search.searchApplied.limit),
            change: new EventEmitter<number>()
          }
        };
      });
    });
  }

  onChangePageMap(page) {
    this.ontologyService.searchTerminologies(this.ontology.id, this.selectedNode.id, { ...this.selectedNode.searchApplied, page }).subscribe(search => {
      this.selectedNode.terminologies = search.records;
      this.selectedNode.searchApplied = search.searchApplied;
      this.selectedNode.pagination = {
        page: search.searchApplied.page,
        pages: Math.ceil(search.searchApplied.tot/search.searchApplied.limit),
        change: new EventEmitter<number>()
      };
    });
  }

  openMetaSemNet() {
    const items = [{
      id: 'newEntity',
      label: '<span style="color:#0567B9;">Nuova entità</span>',
      top: true
    }, {
      id: 'newTerminology',
      label: '<span style="color:#0567B9;">Nuova terminologia</span>',
      top: true
    }];
    this.onOpenMetaSemNet.emit(items);
  }

  onCloseMetaSemNet(event) {
    if(!event)
      return;
    if(this.modalService.getCurrent()) {
      this.refresh.emit({
        ...event,
        type: 'content'
      });
    } else {
      if(event.field === 'newEntity') {
        this.addEntity(event.text);
      } else if(event.field === 'newTerminology') {
        this.addTerminology(null, event.text);
      }
    }
  }

  onDeleteContents({ontologyId, entityId}) {
    const em = new EventEmitter<string>();
    em.subscribe( ({ id }) => {
      if(id === 'confirm') {
        this.ontologyService.deleteEntityContents(ontologyId, entityId).subscribe(() => {
          const index = this.items.map(i => i.id).indexOf(entityId);
          this.items[index].terminologies = 0;
        });
      } else {
        this.bootstrapService.closeModal(); 
      }
    });

    const modalConfig = {
      title: 'Attenzione',
      form: null,
      text: `Proseguendo saranno eliminati tutti i contenuti dell'entità selezionata.<br>
            Sei sicuro di voler proseguire?`,
      buttons: [{
        id: 'cancel',
        type: 'cancel',
        // label: 'Annulla',
        // class: 'btn-default',
        onClick: em
      }, {
        id: 'confirm',
        label: 'Ok',
        class: 'btn-primary',
        onClick: em
      }],
      type: 'v2'
    }
    this.bootstrapService.openModal({class: 'gray modal-lg modal-low'}, modalConfig)
  }

  onDeselect(data): void {
    const newTab = data.heading == 'Entità' ? 'relations' : 'entities';
    if(newTab !== this.activeTab) {
      this.activeTab = newTab;
      this.onTabChange.emit(newTab);
      this.ontologyService.searchItems(this.ontology.id, this.activeTab).subscribe(data => {
        this.setSearch(data);
      });
    }
  }

  onDeselect2(data): void {
    const newTab = data.heading == 'Ricerca' ? 'entities' : 'search';
    if(newTab !== this.activeTab) {
      this.activeTab = newTab;
      if(this.activeTab==='entities') {
        this.ontologyService.searchItems(this.ontology.id, this.activeTab).subscribe(data => {
          this.setSearch(data);
          this.onEditItem({type: 'terminologies', id: this.items[0].id});
        });
      } else {
        this.selectedEntity = null;
        this.activeItem = null;
        this.rightItems = null;
        this.solrSearch();
      }
    }
  }

  onCreateReverse(r) {
    if(r.reverseOf || r.symmetric || !r.id || this.ontology.published)
      return;
    const reverseOf = {
      domain: r.domain,
      codomain: r.codomain,
      id: r.id,
      type: r.name[this.lang]
    }
    this.addRelation({
      reverseOf,
      domain: r.codomain,
      codomain: r.domain,
      disable: {
        reverseOf: true,
        codomain: true,
        transitive: true
      }
    });
  }

  selectFacet(key, value, label) {
    if(!this.searchApplied.facets[key])
      this.searchApplied.facets[key] = [];
    this.searchApplied.facets[key].push(value);
    this.facetsMap[key] = label;
    this.solrSearch({ ...this.searchApplied, page: 1 });
  }

  removeFacet(key, value) {
    if(!this.searchApplied.facets[key])
      return;
    this.searchApplied.facets[key] = this.searchApplied.facets[key].filter(val => val !== value);
    this.solrSearch({ ...this.searchApplied, page: 1 });
  }

  solrSearch(search?) {
    this.ontologyService.searchSolr(this.ontology.id, search).subscribe(data => {
      this.facets = data.facets;
      Object.keys(this.facets).forEach(key => {
        this.facets[key].max = this.visibleFacets;
      });
      this.setSearch(data);
    });
  }

  onChangeSolrPage(page) {
    if(page === this.searchApplied.page)
      return;
    this.solrSearch({ ...this.searchApplied, page });
  }

  onSolrSearch(search) {
    this.solrSearch({ ...this.searchApplied, search, page: 1 });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
