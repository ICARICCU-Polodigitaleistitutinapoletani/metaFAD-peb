import { Injectable } from '@angular/core';
import { BsModalService, ModalOptions, BsModalRef } from 'ngx-bootstrap';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  private currentModals: BsModalRef[] = [];
  private defaultConfig: ModalOptions = {
    backdrop: true,
    ignoreBackdropClick: true,
    class: 'gray modal-xl'
  };

  constructor(
    private bsModalService: BsModalService
  ) { }

  open(content: any, config?: ModalOptions) {
    const newConfig = {
      ...this.defaultConfig,
      ...config || {},
      focus: true,
      show: true
    };
    const modalRef = this.bsModalService.show(content, newConfig);
    this.currentModals.push(modalRef);
    return modalRef;
  }

  close(modal: BsModalRef) {
    return new Promise(resolve => {
      const totModals = this.bsModalService.getModalsCount();
      if (modal && totModals > 0) {
        try {
          const sub: Subscription = this.bsModalService.onHide.subscribe(hidden => {
            this.removeCachedModal(modal);
            sub.unsubscribe();
            this.checkBackdropVisibility();
            resolve();
          });
          modal.hide();
        } catch (e) { }
      } else {
        this.removeCachedModal(modal);
        resolve();
      }
    });
  }

  closeCurrent(closeAudio?: boolean) {
    return new Promise(resolve => {
      if (this.currentModals.length > 0) {
        this.close(this.currentModals[this.currentModals.length - 1]).then(() => resolve());
      } else {
        resolve();
      }
    });
  }

  getCurrent() {
    const totModals = this.bsModalService.getModalsCount();
    if (totModals > 0) {
      return this.currentModals[this.currentModals.length - 1];
    } else {
      return undefined;
    }
  }

  private removeCachedModal(modal) {
    const modalCachedIndex = this.currentModals.indexOf(modal);
    if (modalCachedIndex !== -1) {
      this.currentModals.splice(modalCachedIndex, 1);
    }
  }

  private checkBackdropVisibility() {
    try {
      document.body.className = document.body.className.replace(' hide-backdrop', '');
    } catch (e) {
      document.body.className = document.body.className.replace(' hide-backdrop', '');
    }
  }
}
