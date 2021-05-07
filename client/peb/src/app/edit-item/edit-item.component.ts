import { Component, OnInit, Input, EventEmitter, Output, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, Validators, FormControl, AbstractControl } from '@angular/forms';
import { environment } from './../../environments/environment';
import { debounceTime, distinctUntilChanged, tap, catchError, switchMap, filter, map, startWith, pairwise } from 'rxjs/operators';
import { of, Observable, Subject, BehaviorSubject, Subscription, concat } from 'rxjs';
import { OntologyService } from '../ontology.service';
import { BootstrapService } from '../bootstrap/bootstrap.service';
import { ModalService } from '../modal.service';
import { ModalTemplateComponent } from '../modal-template/modal-template.component';
import { DamComponent } from '../dam/dam.component';

@Component({
  selector: 'app-edit-item',
  templateUrl: './edit-item.component.html',
  styleUrls: ['./edit-item.component.scss']
})
export class EditItemComponent implements OnInit {

  @Input() ontology: { [key: string]: any };
  @Input() activeItem: { [key: string]: any };
  @Input() superclass: { [key: string]: any };
  @Input() info: { [key: string]: any };
  @Input() disableSave$: BehaviorSubject<boolean>;
  @Input() enableDelete$: BehaviorSubject<boolean>;
  @Input() saveItem: EventEmitter<void>;
  @Input() onSave: EventEmitter<{ [key: string]: any }>;
  @Input() onAdd: EventEmitter<{ [key: string]: any }>;
  @Input() onRefresh: EventEmitter<{ [key: string]: any }>;
  @Input() onEdit: EventEmitter<{ [key: string]: any }>;
  @Input() onOpenMetaSemNet: EventEmitter<any>;
  @Input() _properties: { [key: string]: any }[];
  @Input() _relations: { [key: string]: any }[];

  @Input() leftBtnLabel: string;
  @Input() rightBtnLabel: string;

  @Output() onClose: EventEmitter<{ [key: string]: any }> = new EventEmitter();

  lang: string = environment.lang;
  contentForm: FormGroup;
  titleForm: FormGroup;
  enableSave: boolean = false;
  submitted: boolean = false;

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
  // autocompleteFieldMetafad$: {[key: string]: Observable<{[key: string]: any}[]>} = {};
  // autocompleteFieldMetafadLoading: {[key: string]: boolean} = {};
  // autocompleteFieldMetafadInput$: {[key: string]: any} = {};
  // autocompleteFieldMetafadAut$: {[key: string]: Observable<{[key: string]: any}[]>} = {};
  // autocompleteFieldMetafadAutLoading: {[key: string]: boolean} = {};
  // autocompleteFieldMetafadAutInput$: {[key: string]: any} = {};
  autocompleteFieldMetafad: {[key: string]: any}[] = [{id: 'search', value: 'Cerca'}];
  autocompleteFieldMetafadAut: {[key: string]: any}[] = [{id: 'search', value: 'Cerca'}];

  autocompleteEntity$: {[key: string]: Observable<{[key: string]: any}[]>} = {};
  autocompleteEntityLoading: {[key: string]: boolean} = {};
  autocompleteEntityInput$: {[key: string]: any} = {};

  superclassDDOpts: object[];
  liv1DDOpts: { [key: string]: any } = {};
  liv2DDOpts: { [key: string]: any } = {};
  objectKeys = Object.keys;
  sortableOpts: object;
  isAccordionOpen: {[key: string]: boolean} = {
    content: true
  };
  langDDOpts: { [key: string]: any } = {};
  props = [];
  relations = [];
  subclassOf;

  propertiesDDOpts: { [key: string]: any } = {};
  relationsDDOpts: { [key: string]: any } = {};

  private disableSave;
  private subscriptions: Subscription[] = [];
  redrawGraph: EventEmitter<void> = new EventEmitter<void>();
  appId = environment.id;
  disableEditing: boolean;
  invalidTitle: boolean;
  invalidName: boolean;
  orginalInfo: { [key: string]: any } = {};
  disable: { [key: string]: any } = {};
  fromExist: boolean;
  existRelation: { [key: string]: any };
  currentDomain: { [key: string]: any };
  checkrel: boolean;
  private removedItems: { [key: string]: any } = {};
  reverseFilter: string[];
  private currentPicker: { [key: string]: any } = {};
  ternaryRelations: string[] = [];
  ternaryEntities: { [key: string]: any } = {};
  ternaryOrigin;
  fromFacilitated;
  fromGenUriName;

  constructor(
    private formBuilder: FormBuilder,
    private ontologyService: OntologyService,
    private bootstrapService: BootstrapService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {
    this.sortableOpts = { 
      animation: 150,
      onUpdate: (event: any) => {
        if(event.target.id == 'properties') {
          this.reorder('props');
        } else if(event.target.id == 'relations') {
          this.reorder('relations');
        }
        // this.activeItem.properties.map((p, i) => {
        //   p.order = i+1;
        // });
        // this.enableSave = true;
      }
    };

    this.ternaryOrigin = this.ontologyService.ternaryOrigin;
    this.ontologyService.ternaryOrigin = null;
    this.fromFacilitated = this.ontologyService.fromFacilitated;
    this.ontologyService.fromFacilitated = null;
  }

  ngOnInit() {
    this.parseData();
    this.createTitleForm();

    // this.activeItem.properties.sort((a, b) => {
    //   if(a.order < b.order) return -1;
    //   else if(a.order > b.order) return 1;
    //   else return 0;
    // });
    console.log('activeItem', this.activeItem)
    this.contentForm = null;
    if(this.activeItem.content) {
      this.createContentForm(this.activeItem.content);
      this.initAutocomplete();
    }
    
    this.enableSave = !this.activeItem.id;
    this.submitted = false;
    
    if(this.activeItem.name) {
      this.orginalInfo = {
        name: this.activeItem.name[this.lang],
        uriName: this.activeItem.uriName,
        uri: this.activeItem.uri
      };
      this.titleForm.setValue({title: this.activeItem.name[this.lang]});
    }

    this.disableSave = this.disableSave$.getValue();
    this.enableDelete$.next(this.activeItem.id ? true : false);
    this.subscriptions.push(
      this.saveItem.subscribe(() => {
        this.onSaveItem(this.activeItem)
      }),
    );
    if(this.onRefresh) {
      this.subscriptions.push(
        this.onRefresh.subscribe(data => {
          if(data.type === 'data') {
            if(this.activeItem.type === 'entity') {
              let { terminologies, searchApplied, pagination, graph } = data;
              this.activeItem = { ...this.activeItem, terminologies, searchApplied, pagination, graph };
            }
          } else if(data.type === 'content') {
            let { text, field } = data;
            if(field !== 'newEntity' && field !== 'newTerminology') {
              this.contentForm.get('content')['controls'].forEach((c, i) => {
                if(c.controls.id.value+'_'+i === field) {
                  if(c.controls.multivalue.value) {
                    let val = c.controls.items.value;
                    if(!val[val.length-1].value) {
                      val[val.length-1].value = text;
                      c.controls.items.patchValue(val);
                    } else {
                      this._addItem(i, text);
                    }
                  } else {
                    c.controls.items.patchValue([{value: text}]);
                  }
                  this.enableSave = true;
                }
              });
            } else {
              this.onClose.emit(data);
            }
          } else if(data.type === 'update') {
            this.update(data);
          }
        })
      );
    }

    this.props = [];
    this.relations = [];
    this.activeItem.properties.forEach(p => {
      switch(p.type) {
        case 'property':
          this.props.push(p);
          break;
        case 'relation':
          this.relations.push(p);
          break;
        case 'superclass':
          this.subclassOf = p;
          break;
      }
    });
    this.props = this.order(this.props, 'props');
    this.relations = this.order(this.relations, 'relations');
    
    if(this.activeItem.type === 'terminology' && this.appId === 'metafad' && !this.activeItem.content) {
      this.addContentCard()
    }

    if(this.activeItem.type === 'relation' && this.appId === 'metafad') {
      this.initAutocompleteEntity();
      // this.initAutocompleteRelation();
      this.prepareRelationsOpts();
      this.fromExist = this.activeItem.fromExist;
      delete this.activeItem.fromExist;
      const entityRelations = this.activeItem.entityRelations;
      delete this.activeItem.entityRelations;
      this.currentDomain = this.activeItem.currentDomain;
      delete this.activeItem.currentDomain;
      if(entityRelations) {
        this.relationsDDOpts = this.relationsDDOpts.filter(r => entityRelations.findIndex(er => er.id == r.id) === -1);
      }
    }

    if(this.activeItem.type === 'property' && this.appId === 'metafad') {
      this.preparePropertiesOpts();
    }

    if(this.appId === 'metafad') {
      this.checkEditing();
    }

    if(this.activeItem.disable) {
      this.disable = this.activeItem.disable;
      delete this.activeItem.disable;
    }

    if(this.activeItem.errors) {
      const em = new EventEmitter<string>();
      em.subscribe( _id => {
        this.bootstrapService.closeModal(); 
      });
      const modalConfig = {
        msg: '',
        title: 'Attenzione',
        form: null,
        text: this.activeItem.errors,
        buttons: [{
          id: 'confirm',
          label: 'Ok',
          class: 'btn-primary',
          onClick: em
        }],
        type: this.appId == 'metafad' ? 'v2' : ''
      }
      this.bootstrapService.openModal({class: 'alert nested modal-lg'}, modalConfig); 
    }
  }

  private order(items, type) {
    let index;
    if(!this.activeItem.orders) {
      this.activeItem.orders = {
        props: [],
        relations: []
      };
    }
    if(!this.activeItem.orders.props)
      this.activeItem.orders.props = [];
    if(!this.activeItem.orders.relations)
      this.activeItem.orders.relations = [];
    
    items.map((item, i) => {
      index = this.activeItem.orders[type].indexOf(item.id)+1;
      if(index) {
        item.order = index;
      } else {
        this.activeItem.orders[type].push(item.id);
        item.order = this.activeItem.orders[type].length;
      }
    });
    items.sort((a, b) => {
      if(a.order < b.order) return -1;
      else if(a.order > b.order) return 1;
      else return 0;
    });
    return items;
  }

  private reorder(type, noSave?) {
    if(!this.activeItem.orders) {
      this.activeItem.orders = {
        props: [],
        relations: []
      };
    }
    this.activeItem.orders[type] = [];
    this[type].map((item, i) => {
      item.order = i+1;
      this.activeItem.orders[type].push(item.id);
    });
    this.setItemProperties();
    if(!noSave)
      this.enableSave = true;
  }

  private checkEditing() {
    switch(this.activeItem.type) {
      case 'entity':
        this.disableEditing = this.activeItem.terminologies && this.activeItem.terminologies.length;
        break;
    }
  }

  private parseData() {
    this.superclassDDOpts = this.prepareSuperclassDD();
    const properties = this.objectKeys(this.info.properties);
    properties.map(p => {
      this.liv1DDOpts[p] = this.prepareLiv1DD(p);
      this.liv2DDOpts[p] = this.prepareLiv2DD(p);
    });
    this.langDDOpts = this.prepareLangDD();
  }

  get fTitle() { 
    return this.titleForm.controls; 
  }

  get title() {
    return this.titleForm.get('title');
  }

  private prepareSuperclassDD() {
    let superclassDDOpts = [/*{type: '-'}*/];
    const keys = this.objectKeys(this.superclass);
    keys.map(key => {
      if(key != this.activeItem.id) {
        const opt = {
          id: key,
          type: this.superclass[key].name[this.lang]
        };
        superclassDDOpts.push(opt);
      }
    });
    return superclassDDOpts;
  }

  private prepareLangDD() {
    let langDDOpts = [{
      id: 'it',
      type: 'ita'
    }, {
      id: 'en',
      type: 'eng'
    }];
    return langDDOpts;
  }

  private prepareLiv1DD(type) {
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

  private prepareLiv2DD(type) {
    let liv2DDOpts: { [key: string]: any } = {};
    const keys = this.objectKeys(this.info.properties[type]);
    keys.map(key => {
      liv2DDOpts[key] = this.info.properties[type][key] || [];
    });
    // aggiungo il tipo categoria per contuneto e concetto
    if(type==='content' || type==='terminology')
      liv2DDOpts.category = [{id: '', type: 'Peso'}];

    if(type==='entity')
      liv2DDOpts.superclass = this.prepareSuperclassDD();
    return liv2DDOpts;
  }

  private preparePropertiesOpts() {
    console.log(this._properties)
    this.propertiesDDOpts = [];
    this._properties.forEach(p => {
      if(p.id != this.activeItem.id) {
        this.propertiesDDOpts.push({
          id: p.id,
          type: p.name[this.lang]
        });
      }
    })
  }

  private prepareRelationsOpts() {
    this.relationsDDOpts = [];
    this.reverseFilter = [];
    this._relations.forEach(r => {
      console.log('R', r)
      if(r.id != this.activeItem.id) {
        this.relationsDDOpts.push({
          id: r.id,
          type: r.name[this.lang],
          domain: r.domain,
          codomain: r.codomain
        });
      }
      if(r.symmetric) {
        this.reverseFilter.push(r.id);
      }
    })
  }

  private createTitleForm() {
    this.titleForm = this.ternaryOrigin 
      ? this.formBuilder.group({
          title: ['']
        }) 
      : this.formBuilder.group({
          title: ['',
            Validators.required
          ]
        });
  }

  private createContentForm(content) {
    content.sort((a, b) => (a.type > b.type) ? 1 : ((b.type > a.type) ? -1 : 0));
    let check = false;
    content.map(c => {
      if(!check && c.type == 'relation') {
        check = true;
        c.firstRel = true;
      }
    });
    this.contentForm = this.formBuilder.group({
      content: this.formBuilder.array([])
    });
    content.forEach( (c, i) => {
      this.addContent(c);
      this.addItems(c.items, i);
    } );

    this.subscriptions.push(this.contentForm.statusChanges.subscribe(result => {
      console.log(result);
    }));
    this.subscriptions.push(this.contentForm.valueChanges.subscribe(result => {
      // console.log(result.content)
      // result.content.forEach(c => {
      //   c.items.forEach(i => {
      //     console.log(c.name, i)
      //   });
      // });
      // console.log(this.contentForm.status);
      this.enableSave = true;
    }));

    if(this.activeItem.readOnly) {
      this.contentForm.disable();
    }
  }

  private addContent(c) {
    const content = this.contentForm.get('content') as FormArray;
    content.push(this.initContent(c));
  }

  private initContent(c) {console.log(c)
    return this.formBuilder.group({
      contentId: c.id,
      entity: c.entity ? c.entity.id : null,
      name: c.name[this.lang],
      id: c.value ? c.value.id : '',
      type: c.type,
      mandatory: c.mandatory,
      multivalue: c.multivalue,
      items: this.formBuilder.array([
        //this._initItems(c.items)
      ]),
      resolved: c.resolved,
      parent: c.parent,
      lev: c.lev,
      firstRel: c.firstRel,
      forAutomatic: c.forAutomatic
    });
  } 

  private addItems (items, i) {
    items.forEach(item => {
      this.addItem(item, i);
    });
  }

  private addItem(item, i) {
    console.log('item', item)
    const controls = this.contentForm.get('content')['controls'][i];
    if(controls.value.type==='superclass')
      return;
    const items = controls.get('items') as FormArray;
    items.push(this.initItem(item, controls.value));
  }

  _addItem(i, val?) {
    //c.items.push({value: null});
    let add: any = {value: val};
    if(this.contentForm.get('content')['controls'][i].value.id.includes('fieldDateInterval')) {
      add.value2 = val;
    }
    this.addItem(add, i);
  }

  private initItem(item, prop) {
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
    
    if(item.hasOwnProperty('value2')) {
      let value2 = [item.value2];
      let validators2 = [];
      if(prop.mandatory) {
        validators2.push(Validators.required);
        value2.push(validators2);
      }
      return this.formBuilder.group({ value, value2 });
    } else {
      return this.formBuilder.group({ value });
    }
  }

  private initAutocomplete() {
    this.contentForm.get('content')['controls'].forEach(content => {
      if(content.controls.type.value==='relation') {
        
        let _data = [];
        let ternary;
        let label;
        const relation = this.activeItem.content.find(c => c.id == content.controls.contentId.value);
        if(relation && relation.codomain && relation.codomain.length) {
          ternary = this.superclass[relation.codomain[0].id].ternary;

          if(ternary) {
            label = '>> nuovo '+relation.codomain[0].value+' ternaria';
            _data.push({
              id: 'new_'+relation.codomain[0].id,
              value: label
            });
          } else {
            relation.codomain.forEach(c => {
              if(this.superclass[c.id] && this.superclass[c.id].facilitated) {
                label = '>> nuovo '+c.value;
                _data.push({
                  id: 'new_'+c.id,
                  value: label
                });
              }
            });
          }

          // if(this.superclass[this.activeItem.superclass.value].facilitated) {
          //   ternary = this.superclass[relation.codomain[0].id].ternary;
          //   relation.codomain.forEach(c => {
          //     label = '>> nuovo '+c.value;
          //     if(ternary)
          //       label += ' (ternaria)';
          //     _data.push({
          //       id: 'new_'+c.id,
          //       value: label
          //     });
          //   });
          // }
          // console.log(this.superclass[relation.codomain[0].id]);
        }
        
        if(ternary) {
          this.ternaryRelations.push(relation.id);
          this.ternaryEntities[relation.id] = relation.codomain[0];
          this.autocompleteRelation$[content.controls.contentId.value] = of(_data);
        } else {
          this.autocompleteRelationInput$[content.controls.contentId.value] = new Subject<string>();
          this.autocompleteRelation$[content.controls.contentId.value] = concat(
            of(_data),
            this.autocompleteRelationInput$[content.controls.contentId.value].pipe(
              debounceTime(200),
              distinctUntilChanged(),
              tap(() => this.autocompleteRelationLoading[this.ac.contentId.value] = true),
              switchMap((term: string) => {
                return this.ontologyService.relation(this.ac.contentId.value, term).pipe(
                  catchError(() => of([])), // empty list on error
                  map(data => {
                    let i;
                    if(this.ac && this.ac.items && this.ac.items.controls) {
                      this.ac.items.controls.forEach(c => {
                        if(c.value && c.value.value) {
                          if(Array.isArray(c.value.value)) {
                            c.value.value.forEach(v => {
                              if(v.readOnly) {
                                i = data.findIndex(d => d.id == v.id);
                                if((i || i===0) && i!==-1) {
                                  data[i].readOnly = true;
                                }
                              }
                            });
                          } else {
                            if(c.value.value.readOnly) {
                              i = data.findIndex(d => d.id == c.value.value.id);
                              if((i || i===0) && i!==-1) {
                                data[i].readOnly = true;
                              }
                            }
                          }
                        }
                      });
                    }

                    // if(this.superclass[this.activeItem.superclass.value].facilitated) {
                      const relation = this.activeItem.content.find(c => c.id == content.controls.contentId.value);
                      if(relation && relation.codomain) {
                        relation.codomain.forEach(c => {
                          if(this.superclass[c.id] && this.superclass[c.id].facilitated) {
                            data.push({
                              id: 'new_'+c.id,
                              value: '>> nuovo '+c.value
                            });
                          }
                        });
                      }
                    // }

                    return data;
                  }),
                  tap(data => this.autocompleteRelationLoading[this.ac.contentId.value] = false)
                )})
            )
          )
        }
        if(this.ternaryOrigin && relation && relation.codomain && relation.codomain.findIndex(c => c.id == this.ternaryOrigin.superclass.value) > -1) {
          const add = {id: this.ternaryOrigin.id, value: this.ternaryOrigin.name[this.lang], readOnly:true}
          if(content.controls.multivalue.value) {
            let val = content.controls.items.controls[0].controls.value.value || [];
            val.push(add);
            content.controls.items.controls[0].controls.value.patchValue(val);
          } else {
            content.controls.items.controls[0].controls.value.patchValue(add);
          }
        }
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
      } else if(content.controls.type.value==='property' && content.controls.id.value.includes('fieldMetafadAut')) {
        // this.autocompleteFieldMetafadAutInput$[content.controls.contentId.value] = new Subject<string>();
        // this.autocompleteFieldMetafadAut$[content.controls.contentId.value] = this.autocompleteFieldMetafadAutInput$[content.controls.contentId.value].pipe(
        //   debounceTime(200),
        //   distinctUntilChanged(),
        //   filter((t: string) => t && t.length > 2),
        //   tap(() => this.autocompleteFieldMetafadAutLoading[this.ac.contentId.value] = true),
        //   switchMap((term: string) => this.ontologyService.externalRecord(term).pipe(
        //     catchError(() => of([])), // empty list on error
        //     tap(() => this.autocompleteFieldMetafadAutLoading[this.ac.contentId.value] = false)
        //   ))
        // )
      } else if(content.controls.type.value==='property' && content.controls.id.value.includes('fieldMetafad')) {
        // this.autocompleteFieldMetafadInput$[content.controls.contentId.value] = new Subject<string>();
        // this.autocompleteFieldMetafad$[content.controls.contentId.value] = this.autocompleteFieldMetafadInput$[content.controls.contentId.value].pipe(
        //   debounceTime(200),
        //   distinctUntilChanged(),
        //   filter((t: string) => t && t.length > 2),
        //   tap(() => this.autocompleteFieldMetafadLoading[this.ac.contentId.value] = true),
        //   switchMap((term: string) => this.ontologyService.externalRecord(term).pipe(
        //     catchError(() => of([])), // empty list on error
        //     tap(() => this.autocompleteFieldMetafadLoading[this.ac.contentId.value] = false)
        //   ))
        // )
      }
    });
      
  }

  checkRelationCodomain(relId) {
    const relation = this.activeItem.content.find(c => c.id == relId);
    return relation.codomain.findIndex(c => c.id == this.ternaryOrigin.superclass.value) === -1;
  }

  checkRelationValue(event) {
    if(!event)
      return;
    let add;
    if(Array.isArray(event)) {
      add = event.find(item => item.id.indexOf('new_')===0);
    } else {
      add = event.id.indexOf('new_')===0 ? event : false;
    }
    if(add) {
      const val = Array.isArray(event) ? this.ac.items.controls[0].controls.value.value.filter(item => item.id != add.id) : null;
      this.ac.items.controls[0].controls.value.patchValue(val);
      const id = add.id.replace('new_', '');

      this.ontologyService.fromFacilitated = this.ac.contentId.value;
      if(this.ternaryEntities[this.ac.contentId.value] && this.ternaryEntities[this.ac.contentId.value].id == id) {
        if(this.enableSave) {
          const em = new EventEmitter<string>();
          em.subscribe( _id => {
            if(_id.id === 'confirm') {
              if(this._checkForSave()) {
                const em2 = new EventEmitter<string>();
                em2.subscribe( item => {
                  this.addTerminology(id);
                  // this.ontologyService.fromFacilitated = this.ac.contentId.value;
                  this.ontologyService.ternaryOrigin = item;
                  this.bootstrapService.closeModal();
                });
                this.onSaveItem(this.activeItem, em2);
              } else {
                this.ontologyService.fromFacilitated = null;
                this.bootstrapService.closeModal();
                setTimeout(() => {
                  const em2 = new EventEmitter<string>();
                  em2.subscribe( _id => this.bootstrapService.closeModal());
                  const modalConfig2 = {
                    msg: '',
                    title: 'Attenzione',
                    form: null,
                    text: 'Impossibile salvare l\'elemento. Controllare i dati inseriti.',
                    buttons: [{
                      id: 'confirm',
                      label: 'Ok',
                      class: 'btn-primary',
                      onClick: em2
                    }],
                    type: this.appId == 'metafad' ? 'v2' : ''
                  }
                  this.bootstrapService.openModal({class: 'alert nested'}, modalConfig2);
                }, 500);
              }
            } else {
              this.ontologyService.fromFacilitated = null;
              this.bootstrapService.closeModal();
            }
          });
          const modalConfig = {
            msg: '',
            title: 'Attenzione',
            form: null,
            text: 'Per eseguire questa azione è prima necessario salvare il contenuto. Continuare?',
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
            }],
            type: this.appId == 'metafad' ? 'v2' : ''
          }
          this.bootstrapService.openModal({class: 'alert nested'}, modalConfig); 
        } else {
          this.addTerminology(id);
          this.ontologyService.ternaryOrigin = this.activeItem; 
        }
      } else {
        this.addTerminology(id);
      }
    }
  }

  update(data) {
    if(this.activeItem.id != data.item.id) {
      const add = {id: data.item.id, value: data.item.name[this.lang], readOnly: data.ternaryOrigin ? true : false};
      if(data.fromFacilitated && this.activeItem.content.findIndex(c => c.id == data.fromFacilitated)!==-1) {
        this.contentForm.get('content')['controls'].forEach((c, i) => {
          if(data.fromFacilitated == c.controls.contentId.value) {
            if(c.controls.multivalue.value) {
              let val = c.controls.items.controls[0].controls.value.value
              val.push(add);
              c.controls.items.controls[0].controls.value.patchValue(val);
            } else {
              c.controls.items.controls[0].controls.value.patchValue(add);
              // c.controls.items.patchValue([{id: data.item.id, value: data.item.name[this.lang]}]);
            }
            if(c.controls.forAutomatic.value) {
              this.checkForAutomatic(true);
            }
            this.enableSave = true;
          }
        });
      }
    }
  }

  private initAutocompleteEntity() {

    this.autocompleteEntityInput$['domain'] = new Subject<string>();
    this.autocompleteEntity$['domain'] = this.autocompleteEntityInput$['domain'].pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.autocompleteEntityLoading['domain'] = true),
        switchMap((term: string) => {
          return this.ontologyService.entities(this.ontology.id, term).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => this.autocompleteEntityLoading['domain'] = false)
          )})
      )

    this.autocompleteEntityInput$['codomain'] = new Subject<string>();
    this.autocompleteEntity$['codomain'] = this.autocompleteEntityInput$['codomain'].pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.autocompleteEntityLoading['codomain'] = true),
        switchMap((term: string) => {
          return this.ontologyService.entities(this.ontology.id, term).pipe(
            catchError(() => of([])), // empty list on error
            map(data => {
              return data;
            }),
            tap(() => this.autocompleteEntityLoading['codomain'] = false)
          )})
      )
  }

  private initAutocompleteRelation() {

    this.autocompleteRelationInput$['reverse'] = new Subject<string>();
    this.autocompleteRelation$['reverse'] = this.autocompleteRelationInput$['reverse'].pipe(
      debounceTime(200),
      distinctUntilChanged(),
      tap(() => this.autocompleteRelationLoading['reverse'] = true),
      switchMap((term: string) => {
        return this.ontologyService.relation(this.ontology.id, term).pipe(
          catchError(() => of([])), // empty list on error
          tap(() => this.autocompleteRelationLoading['reverse'] = false)
        )})
    )

    this.autocompleteRelationInput$['parent'] = new Subject<string>();
    this.autocompleteRelation$['parent'] = this.autocompleteRelationInput$['parent'].pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.autocompleteRelationLoading['parent'] = true),
        switchMap((term: string) => {
          return this.ontologyService.relation(this.ontology.id, term).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => this.autocompleteRelationLoading['parent'] = false)
          )})
      )

  }

  checkForSave() {
    let disable = (!this.enableSave || !this.titleForm.valid 
                  || ((this.invalidTitle && this.activeItem.type!='terminology') 
                  || (((this.invalidName || !this.activeItem.uriName) && (!this.ternaryOrigin || this.invalidTitle)) 
                  && this.activeItem.type=='terminology')) );

    if(!disable && this.contentForm) {
      disable = !this.contentForm.valid;
    }

    if(this.activeItem.type == 'property') {
      this.enableSave = this.titleForm.valid && this.activeItem.value;
    }

    if(disable !== this.disableSave) {
      this.disableSave = disable;
      setTimeout(() => {
        this.disableSave$.next(disable);
      });
    }
  }

  _checkForSave() {
    let disable = (!this.enableSave || !this.titleForm.valid 
                  || ((this.invalidTitle && this.activeItem.type!='terminology') 
                  || ((this.invalidName || !this.activeItem.uriName) 
                  && this.activeItem.type=='terminology')) );

    if(!disable && this.contentForm) {
      disable = !this.contentForm.valid;
    }
    return !disable;
  }

  toggleAccordion(event, accordion) {
    if(accordion === 'content' && !this.activeItem.content)
      event = false;
    if(event) 
      this.objectKeys(this.isAccordionOpen).map(key => this.isAccordionOpen[key] = false);
    this.isAccordionOpen[accordion] = event;
    if(accordion === 'graph' && event) {
      this.redrawGraph.emit();
    }
  }

  private checkEntity(p1, entities, lev) {
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
        return this.checkEntity(p1, entities.concat(_entities), lev);
    } else {
      return p1;
    }
  }

  private checkSuperclass(p1, entities, lev) {
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
      return this.checkSuperclass(p1, entities, lev);
    }
  }

  addContentCard() {
    this.ontologyService.getEntity(this.activeItem.superclass.value).subscribe(data => {
      let p = data.properties;

      p.forEach(prop => {
        delete prop.resolved;
        delete prop.parents;
        delete prop.parent;
      });
  
      // let properties = this.checkEntity(p, [], 0);
      // properties = this.checkSuperclass(properties, [], 0);
  
      let properties = p;
  
      // properties = properties.filter(p => p.type);
      console.log('properties', properties, this.superclass[this.activeItem.superclass.value].properties)
      properties.forEach(p => {
        p.items = [{value: null}];
        if(p.value && p.value.id && p.value.id.includes('fieldDateInterval')) {
          p.items = [{value: null, value2: null}];
        }
      });
  
      this.activeItem.content = properties;
      this.enableSave = true;
      console.log(properties);
  
      this.createContentForm(properties);
      this.initAutocomplete();
      this.toggleAccordion(true, 'content');
    });
    // let p = JSON.parse(JSON.stringify(this.superclass[this.activeItem.superclass.value].properties));debugger
    
    
  }

  setSuperclass(el) {
    const { opt, item } = el;
    if(this.activeItem.content && (!opt || !item.superclass || opt.id!==item.superclass.value)) {
      const em = new EventEmitter<string>();
      em.subscribe( id => {
        if(id === 'confirm' || id.id === 'confirm') {
          this.enableSave = true;
          delete this.activeItem.content;
          this.contentForm = null;
          if(opt) {
            item.superclass = {value: opt.id};
            this.activeItem.superclass = item.superclass;
            
            this.ontologyService.getEntity(opt.id).subscribe(data => {
              this.superclass[this.activeItem.superclass.value] = data;
              this.addContentCard();
            });
          } else {
            item.superclass = opt;
          }
        }
          
        this.bootstrapService.closeModal(); 
      });
      const msg = opt 
        ? 'Modificando l\'istanza dell\'entità verrà rimossa la scheda contenuto. Continuare?'
        : 'Rimuovendo l\'istanza dell\'entità verrà rimossa la scheda contenuto. Continuare?';
      const text = msg;
      const modalConfig = {
        msg,
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
          type: 'confirm',
          // label: 'Conferma',
          // class: 'btn-primary',
          onClick: em
        }],
        type: this.appId == 'metafad' ? 'v2' : ''
      }
      this.bootstrapService.openModal({class: 'alert'}, modalConfig);
    } else {
      if(!opt || !item.superclass || opt.id!==item.superclass.value)
        this.enableSave = true;
      if(opt) 
        item.superclass = {value: opt.id};
      else
        item.superclass = opt;

      if(item.type === 'entity') {
        if(opt) {
          this.ontologyService.getEntity(opt.id).subscribe(data => {
            this.props = [];
            this.relations = []; 
            data.properties.forEach(p => {
              p.inherited = true;
              switch(p.type) {
                case 'property':
                  this.props.push(p);
                  break;
                case 'relation':
                  this.relations.push(p);
                  break;
              }
            });
            this.activeItem.properties.forEach(p => {
              switch(p.type) {
                case 'property':
                  this.props.push(p);
                  break;
                case 'relation':
                  this.relations.push(p);
                  break;
              }
            });
            this.props = this.order(this.props, 'props');
            this.relations = this.order(this.relations, 'relations');
          });
        } else {
          this.props = [];
          this.relations = []; 
          this.activeItem.properties.forEach(p => {
            switch(p.type) {
              case 'property':
                this.props.push(p);
                break;
              case 'relation':
                this.relations.push(p);
                break;
            }
          });
          this.props = this.order(this.props, 'props');
          this.relations = this.order(this.relations, 'relations');
        }
      }
    } 
  }

  setTopEntity(el) {
    const { opt, item } = el;
    if(opt && item.topEntity && opt.id==item.topEntity.value)
      return;

    if(!opt || !item.topEntity || opt.id!==item.topEntity.value)
      this.enableSave = true;
    if(opt) 
      item.topEntity = {value: opt.id};
    else
      item.topEntity = opt;

    this.ontologyService.getEntity(opt.id).subscribe(data => {
      this.props = [];
      this.relations = []; 
      data.properties.forEach(p => {
        switch(p.type) {
          case 'property':
            this.props.push(p);
            break;
          case 'relation':
            this.relations.push(p);
            break;
        }
      });
      this.activeItem.properties.forEach(p => {
        switch(p.type) {
          case 'property':
            this.props.push(p);
            break;
          case 'relation':
            this.relations.push(p);
            break;
        }
      });
      this.props = this.order(this.props, 'props');
      this.relations = this.order(this.relations, 'relations');
      // this.activeItem.descriptions = data.descriptions;
      // this.activeItem.labels = data.labels;
      Object.assign(this.activeItem, data);
      this.activeItem = this.parseActiveItem(this.activeItem, true);
      this.titleForm.setValue({title: this.activeItem.name[this.lang]});
      delete this.activeItem.id;
    });
  }

  setPropertyType(el) {
    const { opt, item } = el;
    const prop = item;
    if(opt.id===prop.id) // nessuna modfica
      return;
    if(!prop.type)  // nuova prop
      this.activeItem.properties.push({
        // order: this.activeItem.properties.length+1
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

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  private clean(el) {
    if(el.labels)
      el.labels = el.labels.filter(l => l.name);
    if(el.descriptions)
      el.descriptions = el.descriptions.filter(d => d.name);
    return el;
  }

  onSaveItem(item, em?) {
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
    
    let _item = Object.assign({}, item);
    _item = this.clean(_item);
    _item.properties = _item.properties.filter(p => {
      p = this.clean(p);
      return p.type;
    });

    _item.properties.forEach(prop => {
      delete prop.resolved;
      delete prop.parents;
      delete prop.parent;
      delete prop.firstRel;
    });

    // this.onSave.emit(_item);
    delete _item.terminologies;
    delete _item.searchApplied;
    delete _item.pagination;
    delete _item.graph;
    delete _item.modal;

    if(this.activeItem.type === 'terminology') {
      _item.removedItems = { ...this.removedItems };
      this.removedItems = {};
    }

    this.ontologyService.setItem(_item, this.ontology.id, this.ternaryOrigin)
      .subscribe(data => {
        if(this.ternaryOrigin && data.uri === false) {
          this.activeItem.name = data.name;
          this.titleForm.setValue({title: this.activeItem.name[this.lang]});
          this.setUriFromName();
          return;
        }
        delete _item.removedItems;
        if(data.name) {
          this.titleForm.setValue({title: data.name[this.lang]});
        };
        this.activeItem = { ...item, ...data };
        delete this.activeItem.removedItems;
        if(_item.type == 'entity') {
          this.props = [];
          this.relations = []; 
          this.activeItem.properties.forEach(p => {
            switch(p.type) {
              case 'property':
                this.props.push(p);
                break;
              case 'relation':
                this.relations.push(p);
                break;
            }
          });
          this.props = this.order(this.props, 'props');
          this.relations = this.order(this.relations, 'relations');
        }
        if(_item.type != 'relation') {
          this.ontologyService.getGraph(this.activeItem.id, this.activeItem.type).subscribe(graph => {
            this.activeItem.graph = graph;
            if(this.isAccordionOpen['graph'])
              this.redrawGraph.emit();
            // data.properties.push({
            //   order: data.properties.length+1
            // });
            this.enableSave = false;
            this.parseData();
            this.enableDelete$.next(true);
            this.onSave.emit({item: Object.assign({}, this.activeItem), new: !_item.id});
            if(this.fromFacilitated || this.ternaryOrigin) {
              this.ontologyService.onSaveTerminology = {
                fromFacilitated: this.fromFacilitated,
                ternaryOrigin: this.ternaryOrigin,
                item: JSON.parse(JSON.stringify(this.activeItem))
              };
            }
            if(em)
              em.emit(JSON.parse(JSON.stringify(this.activeItem)));
          });
        } else {
          this.enableSave = false;
          this.enableDelete$.next(true);
          this.onSave.emit({item: Object.assign({}, this.activeItem), new: !_item.id});
        }
      });
  }

  onChangePage(page) {
    if(page === this.activeItem.searchApplied.page)
      return;
    const params = { ...this.activeItem.searchApplied, page };
    this.ontologyService.searchTerminologies(this.ontology.id, this.activeItem.id, params).subscribe(search => {
      this.activeItem.terminologies = search.records;
      this.activeItem.pagination.page = search.searchApplied.page;
    });
  }

  addTerminology(id) {
    if(id)
      this.onAdd.emit(id);
  }

  editTerminology(terminology) {
    this.onEdit.emit(terminology);
  }

  removeContent(event) {
    event.preventDefault();
    event.stopPropagation();
    const em = new EventEmitter<string>();
    em.subscribe( id => {
      if(id === 'confirm') {
        delete this.activeItem.content;
        this.contentForm = null;
        this.enableSave = true
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
    this.bootstrapService.openModal({class: 'alert'}, modalConfig);
  }

  openMetaSemNet(event) {
    event.preventDefault();
    event.stopPropagation();
    let items = [{
      id: 'newEntity',
      label: '<span style="color:#0567B9;">Nuova entità</span>',
      top: true
    }, {
      id: 'newTerminology',
      label: '<span style="color:#0567B9;">Nuova terminologia</span>',
      top: true
    }];
    this.contentForm.get('content')['controls'].forEach((c, i) => {
      if(c.controls.type.value === 'property' && 
        (c.controls.id.value.includes('fieldText') || c.controls.id.value.includes('fieldLongText') || c.controls.id.value.includes('fieldDescriptiveText')) ) {
          items.push({id: c.controls.id.value+'_'+i, label: c.controls.name.value, top: false});
        }
    });
    this.onOpenMetaSemNet.emit(items);
  }

  removeItem(i, j, length){
    const items = this.contentForm.get('content')['controls'][i].get('items') as FormArray;
    items.removeAt(j);

    if(length === 1) {
      this._addItem(i);
    }
  }

  setLangValue({ opt, item }) {
    if(item.lang === opt.type)
      return;
    item.lang = opt.type;
    this.enableSave = true;
    this.checkLabels();
    this.checkDescriptions();
  }

  removeLabel(l) {
    let index;
    this.activeItem.labels.map((label, i) => {
      if(Object.is(label, l))
        index = i;
    });
    this.activeItem.labels.splice(index, 1);
    this.enableSave = true;
    this.checkLabels();
  }

  checkLabels() {
    const last = this.activeItem.labels[this.activeItem.labels.length-1];
    if(last.name || last.lang)
      this.activeItem.labels.push({
        // order: this.activeItem.labels.length+1
      });
  }

  removeDescription(d) {
    let index;
    this.activeItem.descriptions.map((desc, i) => {
      if(Object.is(desc, d))
        index = i;
    });
    this.activeItem.descriptions.splice(index, 1);
    this.enableSave = true;
    this.checkDescriptions();
  }

  checkDescriptions() {
    const last = this.activeItem.descriptions[this.activeItem.descriptions.length-1];
    if(last.name || last.lang)
      this.activeItem.descriptions.push({
        // order: this.activeItem.descriptions.length+1
      });
  }

  check(activeItem) {
    if(!activeItem.labels) {
      activeItem.labels = [];
    }
    let last = activeItem.labels[activeItem.labels.length-1];
    if(!last || last.name || last.lang)
      activeItem.labels.push({
        // order: activeItem.labels.length+1
      });

    if(!activeItem.descriptions) {
      activeItem.descriptions = [];
    }
    last = activeItem.descriptions[activeItem.descriptions.length-1];
    if(!last || last.name || last.lang)
      activeItem.descriptions.push({
        // order: activeItem.descriptions.length+1
      });
    return activeItem;
  }

  editProp(activeItem, i?) {
    activeItem.properties = [];
    this.check(activeItem);
    const emSave = new EventEmitter<{ [key: string]: any }>();
    emSave.subscribe(item => {
      this.modalService.closeCurrent();
      delete item.properties;
      item = this.clean(item);

      if(i || i === 0) {
        this.props.splice(i, 1, item);
      } else {
        this.props.push(item);
      }

      this.reorder('props');
    });
    const emClose = new EventEmitter<{ [key: string]: any }>();
    emClose.subscribe(data => {
      
    });
    
    this.ontologyService.canEditProperties(activeItem.id).subscribe(canEdit => {
      this.getProperties('property').then(properties => {
        activeItem.readOnly = !canEdit;
        this.modalService.open(ModalTemplateComponent, { initialState: { 
          activeItem, 
          info: this.info,
          onSave: emSave,
          rightBtnLabel: activeItem.id || (activeItem.name && activeItem.name[this.lang]) ? 'salva' : 'aggiungi',
          onClose: emClose,
          leftBtnLabel: 'indietro',
          superclass: this.superclass,
          ontology: this.ontology,
          noCheck: true,
          useSaveEmitter: true,
          showDelete: activeItem.id && canEdit,
          properties,
          readOnly: !canEdit,
          title: this.activeItem.type=='entity' ? this.activeItem.name[this.lang] : ''
        } });
      })
    })
  }

  private getProperties(type) {
    return new Promise(resolve => {
      this.ontologyService.getOntologyProperties(this.ontology.id, type).subscribe(data => {
        resolve(data);
      })
    })
  }

  addProperty() {
    let activeItem = {
      type: 'property',
      name: {
        [this.lang]: ''
      },
      mandatory: false,
      multivalue: true
    };
    this.editProp(activeItem);
  }

  setPropertyType2(el) {
    const { opt, item } = el;
    item.value = opt;
  }

  removeProp(i) {
    const em = new EventEmitter<string>();
    em.subscribe( id => {
      if(id === 'confirm' || id.id === 'confirm') {
        this.props.splice(i, 1);
        this.reorder('props');
      }
      this.bootstrapService.closeModal(); 
    });
    const modalConfig = {
      title: 'Attenzione',
      form: null,
      text: 'Sei sicuro di voler eliminare definitivamente la proprietà selezionata?',
      buttons: [{
        id: 'cancel',
        type: 'cancel',
        onClick: em
      }, {
        id: 'confirm',
        label: 'Ok',
        class: 'btn-primary',
        onClick: em
      }],
      type: 'v2'
    }
    this.bootstrapService.openModal({class: 'alert nested'}, modalConfig);
  }

  editRelation(activeItem, i?, reverse?) {
    activeItem.properties = [];
    activeItem.domainReadOnly = true;
    this.check(activeItem);
    const emSave = new EventEmitter<{ [key: string]: any }>();
    emSave.subscribe(item => {
      if(reverse) {
        let _item = Object.assign({}, item);
        _item = this.clean(_item);
        _item.properties = _item.properties.filter(p => {
          p = this.clean(p);
          return p.type;
        });
        _item.properties.forEach(prop => {
          delete prop.resolved;
          delete prop.parents;
          delete prop.parent;
          delete prop.firstRel;
        });
        delete _item.domainReadOnly;
        this.ontologyService.setItem(_item, this.ontology.id)
          .subscribe(data => {
            const i = this.relations.findIndex(r => r.id == activeItem.reverseOf.id);
            _item = { ..._item, ...data };
            if(i || i === 0) {
              this.relations[i].reverseOf = {
                domain: _item.codomain,
                codomain: _item.domain,
                id: data.id,
                type: _item.name[this.lang]
              }
              let found = false;
              this.relations[i].domain.forEach(d => {
                if(!found) {
                  found = _item.domain.findIndex(_d => _d.id == d.id) != -1;
                }
              });
              if(found) {
                _item = this.clean(_item);
                this.relations.push(item);

                this.reorder('relations', true);
              }
            }
            this.ontologyService.reloadSearch.emit('entities');
            this.modalService.closeCurrent();
          });
      } else {
        this.modalService.closeCurrent();
        delete item.properties;
        delete item.domainReadOnly;
        item = this.clean(item);
        if(i || i === 0) {
          this.relations.splice(i, 1, item);
        } else {
          this.relations.push(item);
        }
        this.reorder('relations');
      }
    });
    const emClose = new EventEmitter<{ [key: string]: any }>();
    emClose.subscribe(data => {
      
    });
    
    this.ontologyService.canEditProperties(activeItem.id).subscribe(canEdit => {
      this.getProperties('relation').then((relations: any) => {
        if(activeItem.id) {
          const currentRel = relations.find(r => r.id == activeItem.id);
          if(currentRel) {
            activeItem = { ...activeItem, ...currentRel };
          }
        }
        activeItem.readOnly = !canEdit;
        activeItem = this.parseActiveItem(activeItem);
        this.modalService.open(ModalTemplateComponent, { initialState: { 
          activeItem, 
          info: this.info,
          onSave: emSave,
          rightBtnLabel: activeItem.id || (activeItem.name && activeItem.name[this.lang]) || reverse ? 'salva' : 'aggiungi',
          onClose: emClose,
          leftBtnLabel: 'indietro',
          superclass: this.superclass,
          ontology: this.ontology,
          noCheck: true,
          useSaveEmitter: true,
          showDelete: activeItem.id && canEdit,
          relations,
          readOnly: !canEdit,
          title: this.activeItem.type=='entity' ? this.activeItem.name[this.lang] : ''
        } });
      });
    })
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
      domain: [{
        id: this.activeItem.id,
        value: this.activeItem.name[this.lang]
      }]
    };
    let reverse = false;
    if(data.reverseOf) {
      activeItem.domain = [];
      reverse = true;
    }
    activeItem = { ...activeItem, ...data };
    this.editRelation(activeItem, null, reverse);
  }

  removeRelation(i) {
    const em = new EventEmitter<string>();
    em.subscribe( id => {
      if(id === 'confirm' || id.id === 'confirm') {
        this.relations.splice(i, 1);
        this.reorder('relations');
      }
      this.bootstrapService.closeModal(); 
    });
    const modalConfig = {
      title: 'Attenzione',
      form: null,
      text: 'Sei sicuro di voler eliminare definitivamente la relazione selezionata?',
      buttons: [{
        id: 'cancel',
        type: 'cancel',
        onClick: em
      }, {
        id: 'confirm',
        label: 'Ok',
        class: 'btn-primary',
        onClick: em
      }],
      type: 'v2'
    }
    this.bootstrapService.openModal({class: 'alert nested'}, modalConfig);
  }

  setName() {
    if(this.activeItem.name[this.lang] != this.titleForm.value.title) {
      this.activeItem.name[this.lang] = this.titleForm.value.title;
      this.enableSave = true;
    }
    // if(this.activeItem.type === 'property' || this.activeItem.type === 'relation') {
    //   this.activeItem.name[this.lang] = this.titleForm.value.title;
    // }
  }

  // setUriName() {
  //   this.activeItem.uriName = this.titleForm.value.uriName;
  // }

  setUri(terminology?) {
    const name = this.activeItem.name[this.lang];
    if(name && terminology) {
      if(!this.activeItem.uriName)
        this.invalidName = this.ternaryOrigin ? false : true;
    }
    if(!name && !this.ternaryOrigin) {
      this.invalidTitle = true;
    }
    if(terminology || !name) {
      return;
    }
    this.ontologyService.getUri(this.ontology.id, name, this.activeItem.type).subscribe(data => {
      if(!data.uri) {
        if(this.activeItem.name[this.lang] === this.orginalInfo.name) {
          this.invalidTitle = false;
          this.activeItem.uri = this.orginalInfo.uri;
        } else {
          this.invalidTitle = true;
          this.activeItem.uri = '';
        }
      } else {
        this.invalidTitle = false;
        this.activeItem.uri = data.uri;
      }
    })
  }

  setUriFromName() {
    if(this.fromGenUriName)
      return;
    const name = this.ternaryOrigin ? this.activeItem.name[this.lang] : this.activeItem.uriName;
    if(!name) {
      if(this.ternaryOrigin) {
        this.activeItem.uri = '';
      }
      this.invalidTitle = false;
      return;
    }
    this.ontologyService.getUri(this.ontology.id, name, this.activeItem.type).subscribe(data => {
      if(this.ternaryOrigin) {
        if(!data.uri) {
          if(this.activeItem.name[this.lang] === this.orginalInfo.name[this.lang]) {
            this.invalidTitle = false;
            this.activeItem.uri = this.orginalInfo.uri;
          } else {
            this.invalidTitle = true;
            this.activeItem.uri = '';
          }
        } else {
          this.invalidTitle = false;
          this.activeItem.uri = data.uri;
        }
      } else {
        if(!data.uri) {
          if(this.activeItem.uriName === this.orginalInfo.uriName) {
            this.invalidName = false;
            this.activeItem.uri = this.orginalInfo.uri;
          } else {
            this.invalidName = true;
            this.activeItem.uri = '';
          }
        } else {
          this.invalidName = false;
          this.activeItem.uri = data.uri;
        }
      }
        
    })
  }

  private setItemProperties() {
    this.activeItem.properties = [].concat(this.props).concat(this.relations);
    if(this.subclassOf)
      this.activeItem.properties.push(this.subclassOf);
  }

  genUriName(from) {
    console.log('genUriName')
    this.fromGenUriName = false;
    if(from == 'name') {
      this.activeItem.uriName = this.activeItem.name[this.lang];
      this.invalidName = !this.activeItem.uriName;
      this.setUriFromName()
    } else {

    }
    // this.setUri();
  }

  setSubproperty({item, opt}) {
    if(!opt) {
      if(this.activeItem.subpropertyOf)
        this.enableSave = true;
      this.activeItem.subpropertyOf = null;
    } else if(!this.activeItem.subpropertyOf || this.activeItem.subpropertyOf.id !== opt.id) {
      this.activeItem.subpropertyOf = opt;
      this.enableSave = true;
    }  
  }

  setSubrelation({item, opt}) {
    if(!opt) {
      if(this.activeItem.subrelationOf)
        this.enableSave = true;
      this.activeItem.subrelationOf = null;
    } else if(!this.activeItem.subrelationOf || this.activeItem.subrelationOf.id !== opt.id) {
      this.activeItem.subrelationOf = opt;
      this.enableSave = true;
    }
  }

  setReverse({item, opt}) {
    if(!opt) {
      if(this.activeItem.reverseOf)
        this.enableSave = true;
      this.activeItem.reverseOf = null;
    } else if(!this.activeItem.reverseOf || this.activeItem.reverseOf.id !== opt.id) {
      this.activeItem.reverseOf = opt;
      this.activeItem.codomain = opt.domain;
      this.disable.codomain = true;
      this.enableSave = true;
    } 
  }

  clearItem(id, field) {
    this.activeItem[field] = this.activeItem[field].filter(el => el.id != id);
  }

  clearRelation(id, item, c) {
    const relId = c.contentId.value;
    const val = item.value.value.filter(_item => _item.id != id);
    item.value.patchValue(val);
    this.enableSave = true;
    if(this.removedItems[relId]) {
      if(this.removedItems[relId].indexOf(id) === -1)
        this.removedItems[relId].push(id);
    } else {
      this.removedItems[relId] = [id];
    }
  }

  createReverse(r) {
    if(r.reverseOf || r.symmetric || !r.id || this.activeItem.fromTopOntology)
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

  addExistRelation() {
    let activeItem = {
      type: 'relation',
      name: {
        [this.lang]: ''
      },
      mandatory: false,
      multivalue: true,
      fromExist: true,
      copied: true,
      entityRelations: this.relations,
      currentDomain: {
        id: this.activeItem.id,
        value: this.activeItem.name[this.lang]
      }
    };
    this.editRelation(activeItem);
  }

  setExistRelation(r) {
    this.existRelation = r.opt;
    const relation = this._relations.find(_r => _r.id == r.opt.id);
    Object.assign(this.activeItem, relation);
    if(this.currentDomain) {
      this.activeItem.domain.unshift(this.currentDomain);
    }
    this.activeItem = this.parseActiveItem(this.activeItem);
    this.titleForm.setValue({title: this.activeItem.name[this.lang]});
    if(!this.activeItem.uri)
      this.setUri();
  }

  private parseActiveItem(activeItem, top?) {
    if(!activeItem.labels) {
      activeItem.labels = [];
    }
    let last = activeItem.labels[activeItem.labels.length-1];
    if(!last || last.name || last.lang)
    activeItem.labels.push({
        // order: activeItem.labels.length+1
      });
    if(!activeItem.descriptions) {
      activeItem.descriptions = [];
    }
    last = activeItem.descriptions[activeItem.descriptions.length-1];
    if(!last || last.name || last.lang)
      activeItem.descriptions.push({
        // order: activeItem.descriptions.length+1
      });
    if(top) {
      if(activeItem.labels.length > 1) {
        activeItem.labels.pop();
      }
      if(activeItem.descriptions.length > 1) {
        activeItem.descriptions.pop();
      }
    }
    return activeItem;
  }

  allowNumbersOnly(e, negative?) {
    const code = (e.which) ? e.which : e.keyCode;
    if (code > 31 && (code < 48 || code > 57)) {
      if(negative && code==45 && e.target.value=='') {
        console.log('ok');
      } else {
        e.preventDefault();
      }
    }
  }

  openDam(i, j, metafad?) {
    this.currentPicker = {i, j};
    let src;
    if(metafad) {
      src = metafad === 'metafad' 
        ? (this.info.features.links.metafad ? this.info.features.links.metafad.url : '')
        : (this.info.features.links.metafadAut ? this.info.features.links.metafadAut.url : '');
    } else {
      src = (this.info.features.links.dam) ? this.info.features.links.dam.url : '';
    }
    let closeBtn = new EventEmitter<void>();
    closeBtn.subscribe(() => this.modalService.closeCurrent());
    this.currentPicker.modalRef = this.modalService.open(DamComponent, {
      // ignoreBackdropClick: false,
      class: 'modal-xl modal-iframe',
      initialState: {
        src,
        closeBtn
      }
    })
  }

  checkAutomaticTitle() {
    if(this.activeItem.automaticTitle) {
      return;
    }
    this.relations.forEach(r => {
      r.forAutomatic = false;
    });
    this.props.forEach(p => {
      p.forAutomatic = false;
    });
  }

  onEditorKeyUp() {

  }

  private convertDate(inputFormat) {
    function pad(s) { return (s < 10) ? '0' + s : s; }
    const d = new Date(inputFormat);
    return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/');
  }

  checkForAutomatic(forAutomatic?) {
    // this.superclass[this.activeItem.superclass.value].automaticTitle
    if(!forAutomatic)
      return;
    let values = [];
    this.contentForm.controls.content.value.forEach(c => {
      if(c.forAutomatic) {
        c.items.forEach(item => {
          if(item.value) {
            if(Array.isArray(item.value)) {
              item.value.forEach(v => {
                if(c.id.includes('fieldDate')) {
                  values.push(this.convertDate(v.value));
                } else {
                  values.push(v.value);
                }
              });
            } else if(typeof item.value === 'object' && item.value !== null) {
              if(c.id.includes('fieldDate')) {
                values.push(this.convertDate(item.value.value));
              } else {
                values.push(item.value.value);
              }
            } else {
              if(c.id.includes('fieldDate')) {
                values.push(this.convertDate(item.value));
              } else {
                values.push(item.value);
              }
            }
          }
          if(item.value2) {// intervallo di daye
            values.push(item.value2);
          }
        });
      }
    });
    const title = values.join('__');
    if(this.activeItem.name[this.lang] != title) {
      this.activeItem.name[this.lang] = title;
      this.titleForm.setValue({title: this.activeItem.name[this.lang]});
      this.genUriName('name');
      this.enableSave = true;
    }
  }

  openMetafad(event, i, j, metafad) {
    if(!event)
      return;
    let add;
    if(Array.isArray(event)) {
      add = event.find(item => item.id.indexOf('search')===0);
      
    } else {
      add = event.id.indexOf('search')===0 ? event : false;
    }
    if(add) {
      const val = Array.isArray(event) 
        ? this.ac.items.controls[0].controls.value.value.filter(item => item.id != add.id) 
        : null;
      this.ac.items.controls[0].controls.value.patchValue(val);
      
      this.openDam(i, j, metafad);
    }
  }

  clearMetafadItem(id, item, c) {
    const val = item.value.value.filter(_item => _item.id != id);
    item.value.patchValue(val);
    this.enableSave = true;
  }

  @HostListener('window:message', ['$event']) onPostMessage(event) {
    console.log(event);
    if(event.data.type === 'glizycms.onSetMediaPicker') {
      if(this.currentPicker.modalRef && event.data.message) {
        let c = this.contentForm.get('content')['controls'][this.currentPicker.i];
        let val = c.value.items;
        val[this.currentPicker.j].value = event.data.message;
        c.controls.items.patchValue(val);
      }
      if(this.currentPicker.modalRef) {
        this.modalService.close(this.currentPicker.modalRef);
      }
      this.currentPicker = {};
    } else if(event.data.type === 'metafadContent') {
      if(this.currentPicker.modalRef && event.data.message) {
        let c = this.contentForm.get('content')['controls'][this.currentPicker.i];
        let val = c.value.items;
        if(Array.isArray(val[this.currentPicker.j].value)) {
          val[this.currentPicker.j].value.push(event.data.message);
        } else {
          val[this.currentPicker.j].value = event.data.message;
        }
        c.controls.items.patchValue(val);
      }
      if(this.currentPicker.modalRef) {
        this.modalService.close(this.currentPicker.modalRef);
      }
      this.currentPicker = {};
    }
  }

}

// window.postMessage({type:'metafadContent',data:{id:'1',value:'prova'}}, '*');
