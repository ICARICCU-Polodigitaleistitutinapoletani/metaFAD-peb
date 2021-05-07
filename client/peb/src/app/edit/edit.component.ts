import { Component, OnInit, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';

import { environment } from './../../environments/environment';
import { Ontology } from '../ontology';
import { OntologyService } from '../ontology.service';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap, switchMap, catchError, filter } from 'rxjs/operators';
import { BootstrapService } from '../bootstrap/bootstrap.service';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})

export class EditComponent implements OnInit {

  lang: string = environment.lang;
  ontology: Ontology;
  info: { [key: string]: any };
  activeItem: { [key: string]: any };
  superclass: object;
  search: { [key: string]: any } = {
    term: '',
    type: '',
    entity: ''
  };
  types = ['entity', 'terminology'];
  objectKeys = Object.keys;
  superclassDDOpts: object[];
  liv1DDOpts: { [key: string]: any } = {};
  liv2DDOpts: { [key: string]: any } = {};
  sortableOpts: object;
  ontologyName: string;
  ontologyUri: string;
  enableSave: boolean = false;

  titleForm: FormGroup;
  contentForm: FormGroup;
  submitted = false;

  ac: {[key: string]: any} = null;
  autocompleteRelation$: {[key: string]: Observable<{[key: string]: any}[]>} = {};
  autocompleteRelationLoading: {[key: string]: boolean} = {};
  autocompleteRelationInput$: {[key: string]: any} = {};
  autocompleteFieldOpenList$: {[key: string]: Observable<{[key: string]: any}[]>} = {};
  autocompleteFieldOpenListLoading: {[key: string]: boolean} = {};
  autocompleteFieldOpenListInput$: {[key: string]: any} = {};
  autocompleteFieldInternalLink$: {[key: string]: Observable<{[key: string]: any}[]>} = {};
  autocompleteFieldInternalLinkLoading: {[key: string]: boolean} = {};
  autocompleteFieldInternalLinkInput$: {[key: string]: any} = {};

  editorConfig = {
    resize: true,
    branding: false,
    menubar: false,
    statusbar: true,
    toolbar: 'styleselect bold italic | bullist numlist | fxedit',
    external_plugins: {
      fxeditor: 'plugins/fxeditor/editor_plugin.js'
    },
    plugins: 'lists code',
    language: 'it',
    forced_root_block: '',
    style_formats: [
      { title: 'Normale', inline: 'span', classes: 'tinymce-pdt-normal-text' },
      { title: 'Titolo 1', inline: 'span', styles: { fontSize: '1.3em' }, classes: 'tinymce-pdt-title' },
      { title: 'Titolo 2', inline: 'span', styles: { fontSize: '1.1em' }, classes: 'tinymce-pdt-subtitle' }
    ],
    extended_valid_elements: 'math[class|id|xmlns|altimg|alttext|display|overflow],semantics[encoding|definitionURL],annotation[encoding|definitionURL|cd|name|src],annotation-xml[cd|name|encoding|definitionURL|src],merror,mtext,mspace,mover[accent|align],munder,munderover,mstack,mrow[dir],msrow,mfenced[open|close|separators],menclose[notation],mphantom,msup,msub,msubsup,mmultiscripts,mi,mn,mo[fence],ms,mtable,mtr,mtd,mlabeledtr,mfrac[linethickness|bevelled|numalign|denomalign],mfraction,msline,msqrt,mroot,mscarries,mscarry,mstyle[displaystyle]'
  };

  paginationItem: { [key: string]: any }[] = [[]];
  pagination: { [key: string]: any };
  chunk: number = 10;
  currentPage: number;
  currentItems: number;
  map: { [key: string]: any };
  enableMap: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ontologyService: OntologyService,
    private formBuilder: FormBuilder,
    private bootstrapService: BootstrapService
  ) { 
    this.sortableOpts = { 
      animation: 150,
      onUpdate: (event: any) => {
        this.activeItem.properties.map((p, i) => {
          p.order = i+1;
        });
        this.enableSave = true;
      }
    };
  }

  ngOnInit() {
    this.getInfo();
    this.getOntology();
    this.superclassDDOpts = this._prepareSuperclassDD();
    const properties = this.objectKeys(this.info.properties);
    properties.map(p => {
      this.liv1DDOpts[p] = this._prepareLiv1DD(p);
      this.liv2DDOpts[p] = this._prepareLiv2DD(p);
    });
    this._createTitleForm();

    // this.ontologyService.search('').subscribe();
    this.currentPage = 0;
    this.pagination = {
      current: this.currentPage,
      //pages: Math.ceil(tests.length/this.chunk)
      change: new EventEmitter<number>()
    };
    this.calcPages(this.ontology.items, false);

    // this.map = this.route.snapshot.data['map'];
  }

  calcPages(items, force) {
    this.pagination.pages = Math.ceil(items.length/this.chunk);
    if(items.length != this.currentItems || force) {
      console.log(items.length, this.currentItems)
      this.currentItems = items.length;
      setTimeout(() => {
        this.paginationItem = items.map((e, i) => i%this.chunk===0 ? items.slice(i,i+this.chunk) : null)
          .filter(e => e);
      })
    }
    return this.pagination.pages;
  }

  onChangePage(page) {
    const pt = this.paginationItem[page-1];
    this.paginationItem[page-1] = [];
    this.currentPage = page-1;
    //setTimeout(() => {  
      this.paginationItem[this.currentPage] = pt;
    //}, 300);
  }
  
  _prepareSuperclassDD() {
    let superclassDDOpts = [];
    const keys = this.objectKeys(this.superclass);
    keys.map(key => {
      const opt = {
        id: key,
        type: this.superclass[key].name[this.lang]
      };
      superclassDDOpts.push(opt);
    });
    return superclassDDOpts;
  }

  _prepareLiv1DD(type) {
    let liv1DDOpts = [];
    const keys = this.objectKeys(this.info.properties[type]);
    keys.map(key => {
      const opt = {
        id: key,
        type: this.info.labels[key]
      };
      liv1DDOpts.push(opt);
    });
    if(type==='content' || type==='terminology')
      liv1DDOpts.push({id: 'category', type: this.info.labels['category']});
    if(type==='entity')
      liv1DDOpts.push({id: 'superclass', type: this.info.labels['superclass']});
    console.log(liv1DDOpts)
    return liv1DDOpts;
  }

  _prepareLiv2DD(type) {
    let liv2DDOpts: { [key: string]: any } = {};
    const keys = this.objectKeys(this.info.properties[type]);
    keys.map(key => {
      liv2DDOpts[key] = this.info.properties[type][key] || [];
    });
    // aggiungo il tipo categoria per contuneto e concetto
    if(type==='content' || type==='terminology')
      liv2DDOpts.category = [{id: '', type: 'Peso'}];

    if(type==='entity')
      liv2DDOpts.superclass = this._prepareSuperclassDD();
    return liv2DDOpts;
  }

  _getSuperclass(ontology: Ontology) {
    let superclass = {};
    ontology.items.map(item => {
      if(item.type === 'entity')
        superclass[item.id] = item;
    });
    return superclass;
  }

  _parseData() {
    // this.ontology.items.map(item => item.properties.push({
    //   order: item.properties.length+1
    // }));
    this.superclass = this._getSuperclass(this.ontology);
    this.superclassDDOpts = this._prepareSuperclassDD();
    const properties = this.objectKeys(this.info.properties);
    properties.map(p => {
      this.liv1DDOpts[p] = this._prepareLiv1DD(p);
      this.liv2DDOpts[p] = this._prepareLiv2DD(p);
    });
  }

  _createTitleForm() {
    this.titleForm = this.formBuilder.group({
      title: ['',
        Validators.required
      ]
    });
  }

  get fTitle() { 
    return this.titleForm.controls; 
  }

  get title() {
    return this.titleForm.get('title');
  }

  getInfo() {
    let info = this.route.snapshot.data['info'];
    if(info.features.links && info.features.links.knowledgeGraph && info.features.links.knowledgeGraph.url)
      info.features.links.knowledgeGraph.url = info.features.links.knowledgeGraph.url.replace('##ontologyId', encodeURIComponent(this.route.snapshot.data['ontology'].id))
    this.info = info;
    // this.ontologyService.getInfo()
    //   .subscribe(data => {debugger});
  }

  getOntology(): void {
    // const id = this.route.snapshot.paramMap.get('id');
    // this.ontologyService.getOntology(id)
    //   .subscribe(ontology => {
    //     ontology.items.map(item => item.properties.push({
    //       order: item.properties.length+1
    //     }));
    //     this.ontology = ontology;
    //     this.superclass = this._getSuperclass(ontology);
    //   });
    let ontology = this.route.snapshot.data['ontology'];
    ontology.items.map(item => item.properties.push({
      order: item.properties.length+1
    }));
    this.ontology = ontology;
    this.ontology.items.forEach(item => {
      if(!item.name)
        item.name = {};
    });
    this.superclass = this._getSuperclass(ontology);
    console.log(this.superclass)
  }

  onSelectItem(item) {
    if(!item.id || item.id!=this.activeItem) {
      item.properties.sort((a, b) => {
        if(a.order < b.order) return -1;
        else if(a.order > b.order) return 1;
        else return 0;
      });
      console.log(item.properties)
      this.contentForm = null;
      if(item.content) {
        this._createContentForm(item.content);
        this._initAutocomplete();
      }
      this.activeItem = item;
      this.enableSave = !item.id;
      this.submitted = false;
      if(this.activeItem.name)
        this.titleForm.setValue({title: this.activeItem.name[this.lang]});
    }
  }

  onDeleteItem(item) {
    if(item.type==='entity') {
      const found = this.ontology.items.find(el => el.type==='terminology' && el.superclass && el.superclass.value===item.id);
      if(found) {
        const em = new EventEmitter<string>();
        em.subscribe( id => {
          this.bootstrapService.closeModal(); 
        });
        const modalConfig = {
          msg: 'Impossibile eliminare l\'entità in quanto risulta associata ad uno o più concetti.',
          buttons: [{
            id: 'ok',
            label: 'OK',
            class: 'btn-primary',
            onClick: em
          }]
        }
        this.bootstrapService.openModal({}, modalConfig);
        return;
      }
    }
    const { id, type } = item;
    if(id) {
      const em = new EventEmitter<string>();
      em.subscribe( _id => {
        if(_id === 'confirm') {
          this.ontologyService.deleteItem(id, type, this.ontology.id).subscribe(() => {
            const index = this.ontology.items.map(item => item.id).indexOf(id);
            this.ontology.items.splice(index, 1);
            this._parseData();
            if(this.activeItem && this.activeItem.id===id)
              this.activeItem = null;
          });
        }
        this.bootstrapService.closeModal(); 
      });
      const modalConfig = {
        msg: 'Sicuro di voler rimuovere l\'elemento?',
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
      this.bootstrapService.openModal({}, modalConfig); 
    } else {
      this.activeItem = null;
    }
  }

  addEntity() {
    let item = {
      type: 'entity',
      name: {},
      properties: [{
        order: 1
      }],
      uri: this.ontology.uri ? this.ontology.uri+'#{name}' : ''
    };
    //this.activeItem.properties.push();
    item.name[this.lang] = 'Nuova entità';
    this.onSelectItem(item);
  }

  addConcept() {
    let item = {
      type: 'terminology',
      name: {},
      properties: [{
        order: 1
      }]
    };
    item.name[this.lang] = 'Nuovo concetto';
    this.onSelectItem(item);
    this.enableSave = true;
  }

  setSuperclass(el) {
    const { opt, item } = el;
    if(this.activeItem.content && (!opt || opt.id!==item.superclass.value)) {
      const sc = JSON.parse(JSON.stringify(item.superclass));
      const em = new EventEmitter<string>();
      em.subscribe( id => {
        if(id === 'confirm') {
          if(opt)
            item.superclass = {value: opt.id};
          else
            item.superclass = opt;
          delete this.activeItem.content;
          this.contentForm = null;
        }
          
        this.bootstrapService.closeModal(); 
      });
      const msg = opt 
        ? 'Modificando l\'istanza dell\'entità verrà rimossa la scheda contenuto. Continuare?'
        : 'Rimuovendo l\'istanza dell\'entità verrà rimossa la scheda contenuto. Continuare?';
      const modalConfig = {
        msg,
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
      this.bootstrapService.openModal({}, modalConfig);
    } else {
      if(opt)
        item.superclass = {value: opt.id};
      else
        item.superclass = opt;
    }
    
  }

  setPropertyType(el) {
    const { opt, item } = el;
    const prop = item;
    if(opt.id===prop.id) // nessuna modfica
      return;
    if(!prop.type)  // nuova prop
      this.activeItem.properties.push({
        order: this.activeItem.properties.length+1
      });
    this.enableSave = true;
    prop.type = opt.id;
    delete prop.value;
    delete prop.name;
    delete prop.mandatory;
    delete prop.multivalue;
    delete prop.label;
    if(prop.type!=='superclass' && prop.type!=='category') {
      prop.value = {};
      prop.name = {};
      if(this.activeItem.type==='entity') {
        prop.mandatory = false;
        prop.multivalue = false;
      }
    }
  }

  setPropertyValue(el) {
    const { opt, item } = el;
    const prop = item;
    if(prop.type==='category') {
      if(opt.type===prop.label)
        return;
      prop.label = opt.type;
      this.enableSave = true;
      return;
    }
    if( prop.value && ( (prop.type==='relation' && prop.value.value && opt.value.id===prop.value.value.id && (!opt.entity || !prop.entity || opt.entity.id===prop.entity.id)) || (prop.type!=='relation' && opt.id===prop.value.id) ) ) // nessuna modfica
      return;
    this.enableSave = true;
    if(prop.type==='superclass')
      prop.value = opt.id;
    else
      prop.value = opt;
    if(opt.entity)
      prop.entity = opt.entity;
    delete prop.name;
    delete prop.mandatory;
    delete prop.multivalue;
    if(prop.type!=='superclass') {
      prop.name = {};
      if(this.activeItem.type==='entity') {
        prop.mandatory = false;
        prop.multivalue = false;
        prop.name[this.lang] = (opt.value) ? (opt.value.type || '') : '';
      }
    }
  }

  removeProperty(p) {
    let index;
    this.activeItem.properties.map((prop, i) => {
      if(Object.is(prop, p))
        index = i;
    });
    this.activeItem.properties.splice(index, 1);
    this.enableSave = true;
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
    this.router.navigate([baseUrl+'/manage'])
  }

  goToExtraction() {
    const baseUrl = window['BASE_ROUTING'] || '';
    this.router.navigate([baseUrl+'/extraction', encodeURIComponent(this.ontology.id)])
  }

  // onSave() {debugger
  //   if(!this.activeItem)
  //     return;
  //   let activeItem = JSON.parse(JSON.stringify(this.activeItem));
  //   let ontology = JSON.parse(JSON.stringify(this.ontology));
  //   delete activeItem.new;
  //   activeItem.properties.pop();
  //   if(activeItem.id) {
  //     const index = ontology.items.map(o => o.id).indexOf(activeItem.id);
  //     ontology.items.splice(index, 1, activeItem);
  //   } else {
  //     ontology.items.push(activeItem);
  //   }
  //   this.activeItem = {};
  //   console.log('aaaaaaaaaa', ontology.items)
  //   ontology.items.forEach(item => {
  //     item.properties = item.properties.filter(p => {
  //       return p.type;
  //     });
  //   });
  //   console.log('bbbbbbbbbb', ontology.items)
  //   this.ontologyService.updateOntology(ontology.id, ontology)
  //     .subscribe(o => {
  //       this.ontology = o;
        
  //     });
  // }

  onSaveItem(item) {
    // console.log(this.contentForm.get('content'));
    this.submitted = true;
    if (this.titleForm.invalid || (this.contentForm && this.contentForm.invalid)) {
        return;
    }
    item.name[this.lang] = this.title.value;
    if(this.contentForm) {
      const content = this.contentForm.get('content');
      content.value.forEach(c => {
        item.content.find(el => el.id===c.contentId).items = c.items;
      });
    }
    
    const _item = JSON.parse(JSON.stringify(item));
    _item.properties = _item.properties.filter(p => {
      return p.type;
    });

    _item.properties.forEach(prop => {
      delete prop.resolved;
      delete prop.parents;
      delete prop.parent;
    });

    this.ontologyService.setItem(_item, this.ontology.id)
      .subscribe(data => {
        // this.activeItem = null;
        this.activeItem = data;
        data.properties.push({
          order: data.properties.length+1
        });
        if(_item.id) {
          const index = this.ontology.items.map(item => item.id).indexOf(data.id);
          this.ontology.items.splice(index, 1, data);
        } else {
          this.ontology.items.push(data);
        }
        this._parseData();
        this.enableSave = false;
        this.calcPages(this.ontology.items, true);
      });
  }

  _checkEntity(p1, entities, lev) {
    p1 = p1.filter(p => p.type);
    let p2 = {},
      _entities = [];
    p1.forEach((p, i) => {
      console.log(p, p.parents)
      if(p.type==='relation' && p.entity && this.superclass[p.entity.id].inline && !p.resolved && entities.indexOf(p.entity.id)===-1) {
        _entities.push(p.entity.id);
        p.resolved = true;
        p2[i+1] = JSON.parse(JSON.stringify(this.superclass[p.entity.id].properties));
        p2[i+1] = p2[i+1].filter(pp => pp.type);
        p2[i+1].forEach(pp => {
          pp.id = p.id+'|'+pp.id;
          pp.parent = p.id;
          pp.lev = pp.parent.split('|').length;
          if(!pp.parents)
            pp.parents = [];
          pp.parents.push(p.id);
        });
      }
    });
    if(Object.keys(p2).length) {
      Object.keys(p2).slice().reverse().forEach(ind => {
        p1.splice(ind, 0, ...p2[ind]);
      });
      lev++;
      if(lev > 3)
        return p1;
      else
        return this._checkEntity(p1, entities.concat(_entities), lev);
    } else {
      return p1;
    }
  }

  _checkSuperclass(p1, entities, lev) {
    if(!p1.filter(p => p.type==='superclass').length || lev > 3)
      return p1;
    let p2 = [];
    p1.forEach(p => {
      if(p.type==='superclass' && entities.indexOf(p.value)===-1) {
        entities.push(p.value);
        p.resolved = true;
        p2 = p2.concat(JSON.parse(JSON.stringify(this.superclass[p.value].properties)));
        p2.forEach(pp => {
          pp.id = p.id+'|'+pp.id;
          pp.parent = p.id;
          // pp.lev = pp.parent.split('|').length;
          if(!pp.parents)
            pp.parents = [];
          pp.parents.push(p.id);
        });
      }
    });
    if(!p2.length) {
      return p1.filter(p => p.type);
    } else {
      p1 = p1.concat(p2).filter(p => p.type);
      lev++;
      return this._checkSuperclass(p1, entities, lev);
    }
  }

  addContent() {
    let p = JSON.parse(JSON.stringify(this.superclass[this.activeItem.superclass.value].properties));
    
    p.forEach(prop => {
      delete prop.resolved;
      delete prop.parents;
      delete prop.parent;
    });
    let properties = this._checkEntity(p, [], 0);

    properties = this._checkSuperclass(properties, [], 0);
    // properties = properties.filter(p => p.type);
    console.log('properties', properties, this.superclass[this.activeItem.superclass.value].properties)
    properties.forEach(p => {
      p.items = [{value: null}];
    });


    this.activeItem.content = properties;
    this.enableSave = true;
    console.log(properties);

    this._createContentForm(properties);
    this._initAutocomplete();
  }

  removeContent() {
    const em = new EventEmitter<string>();
    em.subscribe( id => {
      if(id === 'confirm') {
        delete this.activeItem.content;
        this.contentForm = null;
      }
      this.bootstrapService.closeModal(); 
    });
    const modalConfig = {
      msg: 'Sicuro di voler rimuovere la scheda contenuto?',
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
    this.bootstrapService.openModal({}, modalConfig);
  }

  addItem(i) {
    //c.items.push({value: null});
    this._addItem({value: null}, i);
  }

  removeItem(i, j){
    const items = this.contentForm.get('content')['controls'][i].get('items') as FormArray;
    items.removeAt(j);
  }

  _initAutocomplete() {
    this.contentForm.get('content')['controls'].forEach(content => {
      if(content.controls.type.value==='relation') {
        this.autocompleteRelationInput$[content.controls.contentId.value] = new Subject<string>();
        this.autocompleteRelation$[content.controls.contentId.value] = this.autocompleteRelationInput$[content.controls.contentId.value].pipe(
            debounceTime(200),
            distinctUntilChanged(),
            tap(() => this.autocompleteRelationLoading[this.ac.contentId.value] = true),
            switchMap((term: string) => {
              return this.ontologyService.relation(this.ac.contentId.value, term).pipe(
                catchError(() => of([])), // empty list on error
                tap(() => this.autocompleteRelationLoading[this.ac.contentId.value] = false)
              )})
          )
      } else if(content.controls.type.value==='property' && content.controls.id.value.includes('fieldOpenList')) {
        this.autocompleteFieldOpenListInput$[content.controls.contentId.value] = new Subject<string>();
        this.autocompleteFieldOpenList$[content.controls.contentId.value] = this.autocompleteFieldOpenListInput$[content.controls.contentId.value].pipe(
            debounceTime(200),
            distinctUntilChanged(),
            tap(() => this.autocompleteFieldOpenListLoading[this.ac.contentId.value] = true),
            switchMap((term: string) => this.ontologyService.fieldOpenList(this.ac.contentId.value, term).pipe(
              catchError(() => of([])), // empty list on error
              tap(() => this.autocompleteFieldOpenListLoading[this.ac.contentId.value] = false)
            ))
          )
      } else if(content.controls.type.value==='property' && content.controls.id.value.includes('fieldInternalLink')) {
        this.autocompleteFieldInternalLinkInput$[content.controls.contentId.value] = new Subject<string>();
        this.autocompleteFieldInternalLink$[content.controls.contentId.value] = this.autocompleteFieldInternalLinkInput$[content.controls.contentId.value].pipe(
          debounceTime(200),
          distinctUntilChanged(),
          filter((t: string) => t && t.length > 2),
          tap(() => this.autocompleteFieldInternalLinkLoading[this.ac.contentId.value] = true),
          switchMap((term: string) => this.ontologyService.fieldInternalLink(term).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => this.autocompleteFieldInternalLinkLoading[this.ac.contentId.value] = false)
          ))
        )
      }
    });
      
  }

  onEditorBlur(ev) {
    console.log('editor blur')
  }
  onEditorKeyUp(ev) {
    console.log('editor keyUp')
  }
  onEditorChange(ev) {
    console.log('editor change')
  }

  _createContentForm(content) {
    this.contentForm = this.formBuilder.group({
      content: this.formBuilder.array([])
    });
    content.forEach( (c, i) => {
      this._addContent(c);
      this._addItems(c.items, i);
    } );
  }

  _addContent(c) {
    const content = this.contentForm.get('content') as FormArray;
    content.push(this._initContent(c));
  }

  _initContent(c) {
    return this.formBuilder.group({
      contentId: c.id,
      entity: c.entity ? c.entity.id : null,
      name: c.name[this.lang],
      id: c.value.id,
      type: c.type,
      mandatory: c.mandatory,
      multivalue: c.multivalue,
      items: this.formBuilder.array([
        //this._initItems(c.items)
      ]),
      resolved: c.resolved,
      parent: c.parent,
      lev: c.lev
    });
  } 

  _addItems (items, i) {
    items.forEach(item => {
      this._addItem(item, i);
    });
  }

  _addItem(item, i) {
    console.log('item', item)
    const controls = this.contentForm.get('content')['controls'][i];
    if(controls.value.type==='superclass')
      return;
    const items = controls.get('items') as FormArray;
    items.push(this._initItem(item, controls.value));
  }

  _initItem(item, prop) {
    //let value = [item.value];
    let value = [item.value];
    let validators = [];
    if(prop.mandatory) 
      validators.push(Validators.required);
    if(prop.id.includes('fieldExternalImage') || prop.id.includes('fieldExternalLink')) {
      const reg = /^((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]+=[a-zA-Z0-9-%]+&?)?$/;
      validators.push(Validators.pattern(reg));
    }
    if(validators.length)
      value.push(validators);
    return this.formBuilder.group({ value });
  }

  openProperties() {
    let item = {
      type: 'dataProperties',
      editProperties: true,
      properties: [{
        order: 1
      }]
    };
    this.onSelectItem(item);
  }

  onSaveDataProperties(item) {
    const _item = JSON.parse(JSON.stringify(item));
    _item.properties = _item.properties.filter(p => {
      return p.type;
    });

    this.ontologyService.saveDataProperties(_item.properties, this.ontology.id)
      .subscribe(data => {
        // this.activeItem = null;
        this.activeItem = {
          type: 'dataProperties',
          editProperties: true,
          properties: data
        }
        this.activeItem.properties.push({
          order: data.length+1
        });
        // this.ontology.dataProperties = data;
        this.enableSave = false;
        // this._parseData();
      });
  }

  audio;
  playAudio($event){
    // $event.preventDefault();
    // $event.stopPropagation();
    // if(this.audio)
    //   this.audio.pause();
    // const graphPath = window['GRAPH_PATH'] || '';
    // this.audio = new Audio();
    // this.audio.src = graphPath+'assets/avengers.mp3';
    // this.audio.load();
    // this.audio.play();
  }
  stopAudio() {
    // if(this.audio)
    //   this.audio.pause();
  }

  showMap($event, audio) {
    if(audio)
      setTimeout(() => {
        this.playAudio($event);
      }, 2000);
    else
      this.stopAudio();
    if(this.enableMap)
      return;
    this.ontologyService.getOntologyMap(this.ontology.id).subscribe(map => {
      this.map = map;
      this.enableMap = true;
    });
  }

}
