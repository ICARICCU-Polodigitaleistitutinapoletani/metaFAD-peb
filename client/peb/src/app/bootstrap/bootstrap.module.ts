import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalModule } from 'ngx-bootstrap/modal';
import { DropzoneModule } from 'ngx-dropzone-wrapper';
import { DROPZONE_CONFIG } from 'ngx-dropzone-wrapper';
import { DropzoneConfigInterface } from 'ngx-dropzone-wrapper';

import { BootstrapService, ModalComponent, ModalComponent2 } from './bootstrap.service';
import { FormsModule } from '@angular/forms';

const DEFAULT_DROPZONE_CONFIG: DropzoneConfigInterface = {
  // url: '',
  // maxFilesize: 50,
  // acceptedFiles: '*'
};

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ModalModule.forRoot(),
    DropzoneModule,
  ],
  declarations: [
    ModalComponent, 
    ModalComponent2
  ],
  entryComponents: [
    ModalComponent,
    ModalComponent2
  ],
  providers: [
    BootstrapService,
    {
      provide: DROPZONE_CONFIG,
      useValue: DEFAULT_DROPZONE_CONFIG
    }
  ]
})
export class BootstrapModule { }
