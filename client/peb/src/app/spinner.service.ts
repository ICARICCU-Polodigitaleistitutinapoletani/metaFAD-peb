import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {

  count: number = 0;

  constructor(
    private spinner: NgxSpinnerService
  ) { }

  show() {
    this.count += 1;
    this.spinner.show();
  }

  hide(force?) {
    this.count -= 1;
    if(this.count < 0 || force)
      this.count = 0;
    if(!this.count)
      this.spinner.hide();
  }
}
