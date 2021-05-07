import { Component, OnInit, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { environment } from './../../environments/environment';
import { Ontology } from '../ontology';
import { OntologyService } from '../ontology.service';
import { BootstrapService } from '../bootstrap/bootstrap.service';
import { RouterService } from '../router.service';

@Component({
  selector: 'app-extraction',
  templateUrl: './extraction.component.html',
  styleUrls: ['./extraction.component.scss']
})
export class ExtractionComponent implements OnInit {

  ontology: Ontology;
  lang: string = environment.lang;
  info: { [key: string]: any };
  superclass: object;
  state: { [key: string]: any };
  dzConfig: { [key: string]: any } = {
    url: window['UPLOAD_URL'] || `${environment.host}/uploader.php`,
    // withCredentials: true,
    // headers: {'Content-Type': 'application/json'}
    //acceptedFiles: 'application/json'
    previewTemplate: `<div class="template-preview">
      <div class="_dz-preview _dz-file-preview">
        <div class="_dz-success-mark">
          <i aria-hidden="true" class="icon fa fa-check"></i></div>
        <div class="_dz-error-mark">
          <i aria-hidden="true" class="icon fa fa-exclamation-triangle"></i>
        </div>
        <div class="_dz-details">
          <div class="_dz-filename">
            <span data-dz-name></span> (<span class="_dz-size" data-dz-size></span>)
          </div>
        </div>
        <div class="dz-progress">
          <span class="dz-upload" data-dz-uploadprogress></span>
        </div>
        <div class="_dz-remove">
          <i aria-hidden="true" class="icon fa fa-trash" data-dz-remove></i>
        </div>
      </div>
    </div>`

  };
  confOpts: { [key: string]: any }[];
  loading: boolean = false;
  objectKeys = Object.keys;
  oneAtATime: boolean = true;
  superclassDDOpts: object[];
  entity: { [key: string]: any } = {
    entity: {
      value: '-'
    },
    terms: '',
    lexicon: false,
    content: false
  };
  checkedTerms: string[] = [];
  accordion: { [key: string]: any } = {};
  fromCreate: boolean;
  selectedContent: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ontologyService: OntologyService,
    private location: Location,
    private bootstrapService: BootstrapService,
    private routerService: RouterService
  ) { }

  ngOnInit() {
    this.state = {
      current: {
        id: 'mode',
        check: false
      },
      prev: []
    }
    this.confOpts = [{
      id: 'base',
      type: 'Base'
    }, {
      id: 'advanded',
      type: 'Avanzata'
    }];

    this.getInfo();
    this.getOntology(); 
    
    this._getSuperclass().then((superclass: any) => {
      this.superclass = superclass;
      this.superclassDDOpts = this._prepareSuperclassDD();
    });
    

    this.fromCreate = this.ontologyService.fromCreate;
    this.ontologyService.fromCreate = false;

  }

  getInfo() {
    this.info = this.route.snapshot.data['info'];
  }

  getOntology() {
    let ontology = this.route.snapshot.data['ontology'];
    ontology.items.map(item => item.properties.push({
      order: item.properties.length+1
    }));
    this.ontology = ontology;
    // this.superclass = this._getSuperclass(ontology);
  }

  _getSuperclass() {
    return new Promise(resolve => {
      this.ontologyService.searchItems(this.ontology.id, 'entities', {limit: 99999}).subscribe(data => {
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

  setMode(type) {
    this.state.current.type = type;
    this.state.current.check = true;
  }

  // _getSuperclass(ontology: Ontology) {
  //   let superclass = {};
  //   ontology.items.map(item => {
  //     if(item.type === 'entity')
  //       superclass[item.id] = item;
  //   });
  //   return superclass;
  // }

  _initState(s) {
    let currentState: { [key: string]: any } = {
      id: s,
      check: false
    };
    switch(s) {
      case 'load': 
        currentState.type = 'upload';
        currentState.config = {};
        currentState.files = [];
        this.state.current = currentState;
        break;
      case 'upload':
        const params = {
          config: this.state.current.config.id,
          files: this.state.current.files
        };

        // const data = {"terms":{"GPE":["Repubblica Italiana","Repubblica","Italia"],"ORG":["Assemblea Costituente","Gazzetta Ufficiale"],"Terminologia":["disposizione finale della Costituzione","dicembre","disposizione finale","Principi fondamentali","Articolo","Preambolo","sovranit\u00e0","Parte","deliberazione","testo","lavoro","democratica","seduta","Costituzione"]}}
        
        this.ontologyService.terminologyExtraction(params)
          .then((data: {[k: string]: any}) => {
            currentState.type = 'term';
            currentState.terms = this._parseTerms(data.terms);
            this.entity = {
              entity: {
                value: '-'
              },
              terms: '',
              lexicon: false,
              content: false
            };
            Object.keys(this.accordion).forEach(k => {
              this.accordion[k] = false;
            });

            this.state.current = currentState;

            console.log(this.state.current);
          });
        break;
      // case 'term': {
      //   const params = {
      //     entity: this.entity.entity,
      //     terms: {
      //       createTerms: this.entity.lexicon,
      //       crateContents: this.entity.content,
      //       value: this.entity.terms
      //     }
      //   };
      //   this.loading = true;
      //   this.ontologyService.addTerms(this.ontology.id, params)
      //     .subscribe(data => {
      //       debugger
      //       this.loading = false;
      //     });
      // }
      case 'exist': 
        currentState.type = 'contents';
        currentState.config = {};
        currentState.files = [];
        this.state.current = currentState;
        this.selectContent(null);
        break;
      case 'contents':

      // const data = {"terms":{"GPE":["Repubblica Italiana","Repubblica","Italia"],"ORG":["Assemblea Costituente","Gazzetta Ufficiale"],"Terminologia":["disposizione finale della Costituzione","dicembre","disposizione finale","Principi fondamentali","Articolo","Preambolo","sovranit\u00e0","Parte","deliberazione","testo","lavoro","democratica","seduta","Costituzione"]}}

        const p = {
          config: this.state.current.config.id,
          courseUuid: this.state.current.courseUuid
        };
        this.ontologyService.terminologyExtractionCourses(p)
          .then((data: {[k: string]: any}) => {
            currentState.type = 'term';
            currentState.terms = this._parseTerms(data.terms);
            this.entity = {
              entity: {
                value: '-'
              },
              terms: '',
              lexicon: false,
              content: false
            };
            Object.keys(this.accordion).forEach(k => {
              this.accordion[k] = false;
            });
            this.state.current = currentState;
          });
          break;
      default:
        this.state.current = currentState;
        break;
    }
  }

  create() {
    let params = {
      // entity: this.entity.entity,
      terms: {
        // createTerms: this.entity.lexicon,
        // createTerms: true,
        // createContents: this.entity.content,
        value: this.entity.terms
      }
    };
    if(this.entity.new || this.entity.exist)
      params['entity'] = this.entity.entity;
    this.loading = true;
    this.ontologyService.addTerms(this.ontology.id, params)
      .subscribe(ontology => {
        this._getSuperclass().then((superclass: any) => {  
          this.ontology = ontology;
          // this.superclass = this._getSuperclass(ontology);
          this.superclass = superclass;
          this.superclassDDOpts = this._prepareSuperclassDD();
          this.entity = {
            entity: {
              value: '-'
            },
            terms: '',
            lexicon: false,
            content: false
          };
          Object.keys(this.accordion).forEach(k => {
            this.accordion[k] = false;
            this.state.current.terms[k].forEach(col => {
              col.forEach(t => {
                delete t.checked;
              });
            });
          });
          this.checkedTerms = [];
          this.loading = false;
          const em = new EventEmitter<string>();
          em.subscribe( id => {
            this.bootstrapService.closeModal(); 
          });
          const modalConfig = {
            msg: 'Terminologia creata.',
            buttons: [{
              id: 'ok',
              label: 'OK',
              class: 'btn-primary',
              onClick: em
            }]
          }
          this.bootstrapService.openModal({}, modalConfig);
      });
    });
  }

  _parseTerms(terms) {
    const chunkArray = (arr, chunk_size) => {
      let results = [];
      while (arr.length) {
        results.push(arr.splice(0, chunk_size));
      }
      return results;
    }
    const keys = this.objectKeys(terms);
    let temp = {};
    keys.map(k => {
      terms[k].sort();
      temp[k] = [];
      terms[k].forEach(term => {
        temp[k].push({label: term});
      });
      const t = chunkArray(temp[k], Math.ceil(temp[k].length/4));
      terms[k] = t;
    });
    return terms;
  }

  cancel() {
    // this.location.back();
    const baseUrl = window['BASE_ROUTING'] || '';
    if(this.fromCreate) {
      this.ontologyService.deleteOntology(this.ontology.id)
      .subscribe(() => {
        this.routerService.goTo('manage');
        // this.router.navigate([baseUrl+'/manage'])
      });
    } else {
      this.routerService.goTo('edit', [this.ontology.id, 'entities']);
      // this.router.navigate([baseUrl+'/edit', encodeURIComponent(this.ontology.id)]);
    }
  }

  finish() {
    const baseUrl = window['BASE_ROUTING'] || '';
    this.routerService.goTo('edit', [this.ontology.id, 'entities']);
    // this.router.navigate([baseUrl+'/edit', encodeURIComponent(this.ontology.id)]);
  }

  goBack() {
    this.state.current = this.state.prev.pop();
  }

  goNext() {
    this.state.prev.push(this.state.current);
    let nextState = this.state.current.type;
    this._initState(nextState);
  }

  onUploadError($event) {
    console.log($event);
    const res = {"success":true,"uploadFilename":"9848826ff681dbafb92153beaa9b9489","originalFilename":"peb.sql"};
    this.state.current.files.push(res.uploadFilename);
    if(this.state.current.config.id)
      this.state.current.check = true;
  }

  onUploadSuccess($event) {
    console.log($event);
    this.state.current.files.push($event[1].uploadFilename);
    if(this.state.current.config.id)
      this.state.current.check = true;
  }

  onUploadCanceled($event) {
    console.log($event);
    // rimuovere file da this.state.current.files
  }

  setConfig(el) {
    const { opt, item } = el;
    item.config = opt;
    if(item.files.length)
      item.check = true;
  }

  setConfig2(el) {
    const { opt, item } = el;
    item.config = opt;
    item.check = item.courseUuid && item.config.id;
  }

  setEntity(el) {
    const { opt, item } = el;
    item.entity = {
      id: opt.id,
      value: opt.type
    };
  }

  checkTerm(t) {
    t.checked = !t.checked;
    if(t.checked)
      this.checkedTerms.push(t.label)
    else
      this.checkedTerms.splice(this.checkedTerms.indexOf(t.label), 1);
    let textareaModel = '';
    this.checkedTerms.forEach(t => {
      textareaModel += (t+'\n');
    });
    this.entity.terms = textareaModel;
    this.onTermsChange();
  }

  setOpened(key, val) {
    this.accordion[key] = val;
  }

  onTermsChange() {
    console.log(this.entity.terms)
  }

  toggleEntityNew() {
    this.entity.new = !this.entity.new;
    this.entity.exist = false;
    this.state.current.check = this.entity.new;
    this.entity.entity = {
      value: this.entity.new ? 'Nuova entità' : '-'
    }
    this.entity.content = false; 
  }

  toggleEntityExist() {
    this.entity.exist = !this.entity.exist;
    this.entity.new = false;
    this.state.current.check = this.entity.exist;
    this.entity.entity = {
      value: '-'
    }
    this.entity.content = false; 
  }

  checkInvalidEntity() {
    return (this.entity.new && !this.entity.entity.value) || (this.entity.exist && !this.entity.entity.id);
  }

  selectContent(id) {
    this.selectedContent = id;
    this.state.current.courseUuid = id;
    this.state.current.check = this.state.current.courseUuid && this.state.current.config.id;
  }

}
