import { Component, OnInit, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Ontology } from '../ontology';
import { OntologyService } from '../ontology.service';
import { RouterService } from '../router.service';
import { BootstrapService } from '../bootstrap/bootstrap.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-managev2',
  templateUrl: './managev2.component.html',
  styleUrls: ['./managev2.component.scss']
})
export class Managev2Component implements OnInit {

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
  lang: string = environment.lang;
  _import;

  constructor(
    private route: ActivatedRoute,
    private routerService: RouterService,
    private ontologyService: OntologyService,
    private bootstrapService: BootstrapService
  ) { }

  ngOnInit() {
    this.type = this.route.snapshot.params['type'];
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
        .subscribe(ontologies => {
          this.ontologies = ontologies;
        });
  }

  onPublish(ontology: Ontology) {
    const em = new EventEmitter<string>();
    em.subscribe( ({ id }) => {
      if(id === 'confirm') {
        this.ontologyService.publishOntology(ontology.id).subscribe(() => {
          const index = this.ontologies.map(o => o.id).indexOf(ontology.id);
          this.ontologies[index].published = true;
          this.ontologies[index].terminology = 0;
          this.bootstrapService.closeModal() 
        });
      } else {
        this.bootstrapService.closeModal(); 
      }
    });
    const modalConfig = {
      title: 'Attenzione',
      form: null,
      text: `La pubblicazione del dominio comporta la cancellazione di tutte le istanze create in fase di lavorazione.
        Inoltre, una volta pubblicato il dominio non sarà più modificabile.<br>
        Sicuro di voler proseguire?`,
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

  onEdit(card) {
    if(card.type==='info') {
      const em = new EventEmitter<string>();
      em.subscribe( ({ id, data }) => {
        if(id === 'save') {
          let ont = {
            name: {
              [this.lang]: data.value.name
            },
            description: data.value.description,
            acronym: data.value.acronym,
            reference: data.value.reference
          };

          this.ontologyService.updateOntology(card.ontology.id, { ...card.ontology, ...ont }).subscribe(ontology => {
            if(ontology.message) {
              const em = new EventEmitter<string>();
              em.subscribe( _id => {
                this.bootstrapService.closeModal2();
              });
              const modalConfig = {
                msg: '',
                title: 'Attenzione',
                form: null,
                text: ontology.message,
                buttons: [{
                  id: 'confirm',
                  label: 'Ok',
                  class: 'btn-primary',
                  onClick: em
                }],
                type: 'v2'
              }
              this.bootstrapService.openModal2({class: 'alert nested modal-lg'}, modalConfig); 
            } else {
              this.getOntologies();
              this.bootstrapService.closeModal();
            }
          });
        } else {
          this.bootstrapService.closeModal(); 
        }
      });
      const modalConfig = {
        title: 'Modifica dominio tematico',
        text: '',
        form: [{
          key: 'name',
          val: card.ontology.name[this.lang],
          label: 'Nome completo'
        }, {
          key: 'description',
          val: card.ontology.description,
          label: 'Descrizione'
        }, {
          key: 'acronym',
          val: card.ontology.acronym,
          label: 'Acronimo (namespace)'
        }, {
          key: 'reference',
          val: card.ontology.reference,
          label: 'Nome di riferimento (per gli indici)'
        }],
        buttons: [{
          id: 'cancel',
          type: 'cancel',
          // label: 'Annulla',
          // class: 'btn-default',
          onClick: em
        }, {
          id: 'save',
          type: 'submit',
          label: 'Salva',
          class: 'btn-secondary',
          onClick: em
        }],
        type: 'v2'
      }
      this.bootstrapService.openModal({class: 'gray modal-lg modal-low'}, modalConfig)
    } else {
      this.routerService.goTo('edit', [card.ontology.id, card.type]);
    }
  }

  onDelete({ontology, content}) {
    const em = new EventEmitter<string>();
    em.subscribe( ({ id }) => {
      if(id === 'confirm') {
        if(content) {
          this.ontologyService.deleteOntologyContents(ontology.id).subscribe(() => {
            const index = this.ontologies.map(o => o.id).indexOf(ontology.id);
            this.ontologies[index].terminology = 0;
            this.bootstrapService.closeModal();
          });
        } else {
          this.ontologyService.deleteOntology(ontology.id)
            .subscribe(() => {
              const index = this.ontologies.map(o => o.id).indexOf(ontology.id);
              this.ontologies.splice(index, 1);
              this.bootstrapService.closeModal();
            });
        }
      } else {
        this.bootstrapService.closeModal(); 
      }
    });
    const modalConfig = {
      title: 'Attenzione',
      form: null,
      text: content 
        ? `Proseguendo saranno eliminati tutti i contenuti presenti all'interno del dominio selezionato.<br>
          Sei sicuro di voler proseguire?`
        : `La cancellazione del dominio comporta la rimozione di tutte le entità e istanze in esso contenute.<br>
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

  onDownload({ id, model }) {
    this.ontologyService.downloadOntology(id, model);
  }

  onUpload($event) {
    const em = new EventEmitter<string>();
    em.subscribe( ({id, data}) => {
      if(id === 'import') {
        if(!this._import)
          return;
        console.log('import in', $event)
        this.ontologyService._import(this._import, $event)
          .subscribe((ontology: any) => {
            if(ontology.message) {
              const em = new EventEmitter<string>();
              em.subscribe( _id => {
                this.bootstrapService.closeModal2();
              });
              const modalConfig = {
                msg: '',
                title: 'Attenzione',
                form: null,
                text: ontology.message,
                buttons: [{
                  id: 'confirm',
                  label: 'Ok',
                  class: 'btn-primary',
                  onClick: em
                }],
                type: 'v2'
              }
              this.bootstrapService.openModal2({class: 'alert nested modal-lg'}, modalConfig); 
            } else {
              this.bootstrapService.closeModal();
              this.routerService.goTo('edit', [ontology.id, 'entities']);
            }
          });
        // this.bootstrapService.closeModal(); 
      } else {
        this.bootstrapService.closeModal(); 
      }
    });
    let imp = {
      dzConfig: {
        url: window['UPLOAD_URL'] || `${environment.host}/uploader.php`,
        uploadMultiple: false,
        // withCredentials: true,
        // headers: {'Content-Type': 'application/json'},
        //acceptedFiles: 'application/json'
        previewTemplate: `<div class="template-preview">
          <div class="_dz-preview _dz-file-preview" style="display: flex;">
            <div class="_dz-success-mark" style="margin: 5px;">
              <i aria-hidden="true" class="icon fa fa-check"></i></div>
            <!-- <div class="_dz-error-mark" style="margin: 5px;">
              <i aria-hidden="true" class="icon fa fa-exclamation-triangle"></i>
            </div> -->
            <div class="_dz-details" style="margin: 5px;">
              <div class="_dz-filename">
                <span data-dz-name></span> (<span class="_dz-size" data-dz-size></span>)
              </div>
            </div>
            <div class="dz-progress" style="margin: 5px;">
              <span class="dz-upload" data-dz-uploadprogress></span>
            </div>
            <div class="_dz-remove" style="margin: 5px;">
              <i aria-hidden="true" class="icon fa fa-trash" data-dz-remove></i>
            </div>
          </div>
        </div>`
      },
      onUploadError: $event => {
        console.log($event);
        // const res = {"success":true,"uploadFilename":"9848826ff681dbafb92153beaa9b9489","originalFilename":"peb.sql"};
        // this.state.current.files.push(res.uploadFilename);
        // if(this.state.current.config.id)
        //   this.state.current.check = true;
      },
      onUploadSuccess: $event => {
        console.log($event);
        this._import = $event[1].uploadFilename;
        // this.state.current.files.push($event[1].uploadFilename);
        // if(this.state.current.config.id)
        //   this.state.current.check = true;
      },
      onUploadCanceled: $event => {
        console.log($event);
        // rimuovere file da this.state.current.files
      }
    }
    const modalConfig = {
      title: 'Importazione',
      text: '',
      import: imp,
      buttons: [{
        id: 'cancel',
        type: 'cancel',
        // label: 'Annulla',
        // class: 'btn-default',
        onClick: em
      }, {
        id: $event ? 'import' : 'save',
        type: $event ? '' : 'submit',
        label: $event ? 'Importa' : 'Salva',
        class: 'btn-secondary',
        onClick: em
      }],
      type: 'v2'
    }
    this.bootstrapService.openModal({class: 'gray modal-lg modal-low'}, modalConfig)
  }

  createOntology($event) {
    const em = new EventEmitter<string>();
    em.subscribe( ({id, data}) => {
      if(id === 'save') {
        let ont = {
          name: {
            [this.lang]: data.value.name
          },
          description: data.value.description,
          acronym: data.value.acronym,
          reference: data.value.reference
        }
        this.ontologyService.createOntology(ont)
          .subscribe(ontology => {
            if(ontology.message) {
              const em = new EventEmitter<string>();
              em.subscribe( _id => {
                this.bootstrapService.closeModal2();
              });
              const modalConfig = {
                msg: '',
                title: 'Attenzione',
                form: null,
                text: ontology.message,
                buttons: [{
                  id: 'confirm',
                  label: 'Ok',
                  class: 'btn-primary',
                  onClick: em
                }],
                type: 'v2'
              }
              this.bootstrapService.openModal2({class: 'alert nested modal-lg'}, modalConfig); 
            } else {
              this.bootstrapService.closeModal();
              this.routerService.goTo('edit', [ontology.id, 'entities']);
            }
          });
      } else {
        this.bootstrapService.closeModal(); 
      }
    });
    let form = [{
        key: 'name',
        val: '',
        label: 'Nome completo'
      }, {
        key: 'description',
        val: '',
        label: 'Descrizione'
      }, {
        key: 'acronym',
        val: '',
        label: 'Acronimo (namespace)'
      }, {
        key: 'reference',
        val: '',
        label: 'Nome di riferimento (per gli indici)'
      }];

    const modalConfig = {
      title: 'Crea nuovo dominio tematico',
      text: '',
      form,
      buttons: [{
        id: 'cancel',
        type: 'cancel',
        // label: 'Annulla',
        // class: 'btn-default',
        onClick: em
      }, {
        id: $event ? 'import' : 'save',
        type: $event ? '' : 'submit',
        label: $event ? 'Importa' : 'Salva',
        class: 'btn-secondary',
        onClick: em
      }],
      type: 'v2'
    }
    this.bootstrapService.openModal({class: 'gray modal-lg modal-low'}, modalConfig)
  }
}
