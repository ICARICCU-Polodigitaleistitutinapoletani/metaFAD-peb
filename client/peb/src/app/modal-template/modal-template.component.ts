import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { ModalService } from '../modal.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { BootstrapService } from '../bootstrap/bootstrap.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-modal-template',
  templateUrl: './modal-template.component.html',
  styleUrls: ['./modal-template.component.scss']
})
export class ModalTemplateComponent implements OnInit {

  ontology: { [key: string]: any };
  activeItem: { [key: string]: any };
  superclass: { [key: string]: any };
  info: { [key: string]: any };
  disableSave$: BehaviorSubject<boolean> = new BehaviorSubject(true);
  disableSave: boolean = true;
  onDelete: EventEmitter<{ [key: string]: any }>;
  onSave: EventEmitter<{ [key: string]: any }>;
  onAdd: EventEmitter<{ [key: string]: any }>;
  saveItem: EventEmitter<void> = new EventEmitter();
  enableDelete$: BehaviorSubject<boolean> = new BehaviorSubject(true);
  enableDelete: boolean = true;
  onRefresh: EventEmitter<{ [key: string]: any }>;
  onEdit: EventEmitter<{ [key: string]: any }>;
  onOpenMetaSemNet: EventEmitter<{ [key: string]: any }>;
  onClose: EventEmitter<{ [key: string]: any }>;
  appId = environment.id
  leftBtnLabel: string;
  rightBtnLabel: string;
  noCheck: boolean;
  useSaveEmitter: boolean;
  showDelete: boolean;
  properties: { [key: string]: any }[];
  relations: { [key: string]: any }[];
  hideSave: boolean;
  title: string;

  private subscriptions: Subscription[] = [];

  constructor(
    private modalService: ModalService,
    private bootstrapService: BootstrapService
  ) {
    this.subscriptions.push(
      this.disableSave$.subscribe(val => this.disableSave = val),
      this.enableDelete$.subscribe(val => this.enableDelete = val)
    );
  }

  ngOnInit() {
    
  }

  close(data?) {
    if(this.disableSave || this.noCheck) {
      this.modalService.closeCurrent();
      this.onClose.emit(data);
    } else {
      const em = new EventEmitter<string>();
      em.subscribe( id => {
        if(id === 'confirm' || id.id === 'confirm') {
          this.saveItem.emit();
        } 
        this.bootstrapService.closeModal(); 
        this.modalService.closeCurrent();
        this.onClose.emit(data);
      });
      const msg = 'Ci sono delle modifiche non salvate. Salvare prima di chiudere?';
      let modalConfig;
      if(this.appId === 'metafad') {
        modalConfig = {
          text: msg,
          buttons: [{
            id: 'cancel',
            label: 'No',
            class: 'btn btn-default',
            onClick: em
          }, {
            id: 'confirm',
            label: 'Si',
            class: 'btn btn-secondary',
            onClick: em
          }],
          type: 'v2'
        }
      } else {
        modalConfig = {
          msg,
          buttons: [{
            id: 'cancel',
            label: 'No',
            class: 'btn-no-bg btn-lg no-upper col-6 col-sm-4',
            onClick: em
          }, {
            id: 'confirm',
            label: 'Si',
            class: 'btn-lg btn-primary col-6 col-sm-4',
            onClick: em
          }]
        }
      }
      this.bootstrapService.openModal({class: 'alert'}, modalConfig);
    }
  }

  save() {
    if(this.disableSave)
      return;
    if(this.useSaveEmitter) {
      this.onSave.emit(this.activeItem);
    } else {
      this.saveItem.emit();
    }
  }

  delete() {
    if(!this.enableDelete)
      return;
    this.onDelete.emit(this.activeItem);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
