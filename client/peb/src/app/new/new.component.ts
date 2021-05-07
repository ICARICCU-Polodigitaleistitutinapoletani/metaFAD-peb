import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

import { environment } from './../../environments/environment';
import { OntologyService } from '../ontology.service';
import { Observable } from '../../../node_modules/rxjs';
import { RouterService } from '../router.service';

@Component({
  selector: 'app-new',
  templateUrl: './new.component.html',
  styleUrls: ['./new.component.scss']
})
export class NewComponent implements OnInit {

  public createForm: FormGroup;
  private baseUrl = window['BASE_ROUTING'] || '';
  lang: string = environment.lang;
  info: { [key: string]: any };
  models: { [key: string]: any }[];
  activeModel: { [key: string]: any } = {};
  activeModel2: { [key: string]: any } = {};
  choice: { [key: string]: any } = {};
  state = [];
  modelType: string;
  modelTitle: string;
  ontology: { [key: string]: any } = {
    name: {
      [this.lang]: ''
    },
    imported: [],
    derivedFrom: ''
  };
  entities: { [key: string]: any };
  checkName: boolean;
  checkModel: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ontologyService: OntologyService,
    private location: Location,
    private formBuilder: FormBuilder,
    private routerService: RouterService
  ) { }

  ngOnInit() {
    this.getInfo();
    this._prepareModels(false);
    this._createForm();
  }

  _prepareModels(fromBack) {
    let models = [{
      id: 'new',
      name: {
        [this.lang]: 'Nuova'
      },
      text: ''
    }, {
      id: 'topDerived',
      name: {
        [this.lang]: 'Derivata dalla top ontology'
      },
      text: ''
    }, {
      id: 'existDuplicate',
      name: {
        [this.lang]: 'Duplica ontologia esistente'
      },
      text: ''
    }, {
      id: 'extract',
      name: {
        [this.lang]: 'Da estrazione terminologica'
      },
      text: ''
    }, {
      id: 'merge',
      name: {
        [this.lang]: 'Unisci due ontologie'
      },
      text: '',
      disable: !this.info.features.enableMerge
    }];
    this.models = models;
    this.modelType = 'model';
    this.modelTitle = 'Seleziona il modello di ontologia';
    this.activeModel = this.choice[this.modelType] || {};
    this.activeModel2 = {};
    if(!fromBack)
      this.state.push(this.modelType);
  }

  _prepareTopOntologies(fromBack) {
    this.models = this.info.top_ontologies;
    this.modelType = 'topOntology';
    this.modelTitle = 'Seleziona la top ontology';
    this.activeModel = this.choice[this.modelType] || {};
    this.activeModel2 = {};
    if(!fromBack)
      this.state.push(this.modelType);
  }

  _prepareExistingOntologies(fromBack) {
    this.ontologyService.getOntologies()
        .subscribe(ontologies => {
          this.models = ontologies;
          this.modelType = 'existOntology';
          this.modelTitle = 'Seleziona l\'ontologia';
          this.activeModel = this.choice[this.modelType] || {};
          this.activeModel2 = {};
          if(!fromBack)
            this.state.push(this.modelType);
        });
  }

  _prepareMergeOntologies(fromBack) {
    this.ontologyService.getOntologies()
        .subscribe(ontologies => {
          this.models = ontologies;
          this.modelType = 'mergeOntologies';
          this.modelTitle = 'Seleziona le ontologie da unire';
          this.activeModel = this.choice[this.modelType] || {};
          this.activeModel2 = {};
          if(!fromBack)
            this.state.push(this.modelType);
        });
  }

  _prepareEntities(entities) {
    this.modelType = 'entities';
    this.state.push(this.modelType);
    const chunkArray = (arr, chunk_size) => {
      let results = [];
      while (arr.length) {
        results.push(arr.splice(0, chunk_size));
      }
      return results;
    }
    const lang = this.lang
    entities.sort((a, b) => {

      if(!a.name)
        a.name = {
          it: 'a'
        }
      if(!b.name)
        b.name = {
          it: 'b'
        }

      var nameA = a.name[lang].toUpperCase();
      var nameB = b.name[lang].toUpperCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });
    const e = chunkArray(entities, Math.ceil(entities.length/4));
    this.entities = e;
    this.choice[this.modelType] = this.entities;
  }

  _createForm() {
    this.createForm = this.formBuilder.group({
      name: ['',
        Validators.required
      ]
    });
  }

  get name() {
    return this.createForm.get('name');
  }

  getInfo() {
    this.info = this.route.snapshot.data['info'];
  }

  cancel(): void {
    this.location.back();
  }

  goBack(): void {
    console.log('state', this.state)
    delete this.choice[this.modelType];
    this.state.pop();
    switch(this.state[this.state.length-1]) {
      case 'model':
        this._prepareModels(true);
        break;
      case 'topOntology':
        this._prepareTopOntologies(true);
        break;
      case 'existOntology':
        this._prepareExistingOntologies(true);
        break;
      case 'mergeOntologies':
        this._prepareMergeOntologies(true);
    }
    console.log('state', this.state)
  }

  goNext() {
    if(this.createForm.invalid || !this.activeModel.id || (this.modelType === 'mergeOntologies' && !this.activeModel2.id)) {
      this.checkName = true;
      this.checkModel = true;
      return;
    }
    switch(this.modelType) {
      case 'model':
        this.checkModel = false;
        this.ontology.name[this.lang] = this.name.value;
        switch(this.activeModel.id) {
          case 'new':
            this.createOntology().subscribe((ontology: any) => {
              // this.router.navigate([this.baseUrl+'/edit', encodeURIComponent(ontology['id'])]);
              this.routerService.goTo('edit', [ontology.id, 'entities']);
            });
            break;
          case 'topDerived':
            this._prepareTopOntologies(false);
            break;
          case 'existDuplicate':
            this._prepareExistingOntologies(false);
            break;
          case 'merge':
            this._prepareMergeOntologies(false);
            break;
          case 'extract':
            this.createOntology().subscribe(ontology => {
              this.ontologyService.fromCreate = true;
              this.router.navigate([this.baseUrl+'/extraction', encodeURIComponent(ontology['id'])]);
            });
            break;
        }
        break;
      case 'topOntology':
        this.ontologyService.getOntologyEntities(this.activeModel.id)
          .subscribe(entities => {
            this.ontology.derivedFrom = this.activeModel.id;
            this._prepareEntities(entities);
          });
        break;
      case 'entities':
        this.ontology.imported = [];
        this.entities.map(c => {
          c.map(e => {
            if(e.checked)
              this.ontology.imported.push(e.id);
          });
        });
        this.createOntology().subscribe((ontology: any) => {
          this.routerService.goTo('edit', [ontology.id, 'entities']);
          // this.router.navigate([this.baseUrl+'/edit', encodeURIComponent(ontology['id'])]);
        });
        break;
      case 'existOntology':
        this.ontologyService.duplicateOntology(this.ontology, this.activeModel.id).subscribe(newOntology => {
          this.routerService.goTo('edit', [newOntology.id, 'entities']);
          // this.router.navigate([this.baseUrl+'/edit', encodeURIComponent(newOntology['id'])]);
        });
        break;

      case 'mergeOntologies':
        this.ontologyService.mergeOntologies(this.ontology, this.activeModel.id, this.activeModel2.id).subscribe(newOntology => {
          this.routerService.goTo('edit', [newOntology.id, 'entities']);
          // this.router.navigate([this.baseUrl+'/edit', encodeURIComponent(newOntology['id'])]);
        });
        break;
    }
  }

  setModel(model) {
    if(model.id == this.activeModel.id) {
      this.activeModel = {};
      this.choice[this.modelType] = {};
      return;
    }
    if(this.modelType === 'mergeOntologies') {
      if(this.activeModel.id) {
        if(model.id == this.activeModel2.id) {
          this.activeModel2 = {};
          return;
        }
        this.activeModel2 = model;
      } else {
        this.activeModel = model;
        this.choice[this.modelType] = model;
      }
    } else {
      this.activeModel = model;
      this.choice[this.modelType] = model;
    }
  }

  createOntology() {
    return new Observable(observer => {
      this.ontologyService.createOntology(this.ontology)
      .subscribe(ontology => {
        observer.next(ontology);
        observer.complete();
      });
    });
  }

}
