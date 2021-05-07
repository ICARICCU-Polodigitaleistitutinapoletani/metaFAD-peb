import { Component, Injectable, Output, EventEmitter, ViewChild } from '@angular/core';
import { ISubscription } from "rxjs/Subscription";
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { NgForm } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class BootstrapService {

  @Output() onOpenModal: EventEmitter<{ [key: string]: any }> = new EventEmitter();
  @Output() onOpenModal2: EventEmitter<{ [key: string]: any }> = new EventEmitter();

  modalRef: BsModalRef;
  modalRef2: BsModalRef;
  modalOptions: { [key: string]: any } = {
    
  };
  modalConfig: { [key: string]: any } = {
    buttons: [],
    close: this.closeModal.bind(this)
  };

  constructor(
    private modalService: BsModalService
  ) { }

  openModal(opts, conf) {
    let options = Object.assign({}, this.modalOptions);
    options = Object.assign(options, opts);
    let config = Object.assign({}, this.modalConfig);
    config = Object.assign(config, conf);
    this.modalRef = this.modalService.show(ModalComponent, options);
    this.onOpenModal.emit(config);

    const nested = document.getElementsByClassName('nested')[0];
    if(nested) {
      nested.parentElement.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    }

    return this.modalRef;
  }

  openModal2(opts, conf) {
    let options = Object.assign({}, this.modalOptions);
    options = Object.assign(options, opts);
    let config = Object.assign({}, this.modalConfig);
    config = Object.assign(config, conf);
    this.modalRef2 = this.modalService.show(ModalComponent2, options);
    this.onOpenModal2.emit(config);

    const nested = document.getElementsByClassName('nested')[0];
    if(nested) {
      nested.parentElement.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    }

    return this.modalRef;
  }

  closeModal(modalId?) {
    // document.getElementsByClassName('modal-backdrop')[0]['style'].zIndex = 1040;
    if(modalId)
      this.modalService.hide(modalId);
    else
      this.modalRef.hide();
  }

  closeModal2(modalId?){
    if(modalId)
      this.modalService.hide(modalId);
    else
      this.modalRef2.hide();
  }

}

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {

  @ViewChild('dataForm') dataForm: NgForm;
  private subscription: ISubscription;

  constructor(
    private bootstrapService: BootstrapService
  ) {
    this.subscription = this.bootstrapService.onOpenModal.subscribe( conf => {
      this.config = conf;
    });
  }

  config: { [key: string]: any } = {};

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent2 {

  @ViewChild('dataForm') dataForm: NgForm;
  private subscription: ISubscription;

  constructor(
    private bootstrapService: BootstrapService
  ) {
    this.subscription = this.bootstrapService.onOpenModal2.subscribe( conf => {
      this.config = conf;
    });
  }

  config: { [key: string]: any } = {};

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}
