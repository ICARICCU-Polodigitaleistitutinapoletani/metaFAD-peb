import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { SortablejsModule } from 'angular-sortablejs';
import { DropzoneModule } from 'ngx-dropzone-wrapper';
import { DROPZONE_CONFIG } from 'ngx-dropzone-wrapper';
import { DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { NgPipesModule } from 'ng-pipes';
import { NgxSpinnerModule } from 'ngx-spinner';
import { NgSelectModule } from '@ng-select/ng-select';
import { EditorModule as TinyEditorModule } from '@tinymce/tinymce-angular';
import { UiSwitchModule } from 'ngx-toggle-switch';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { AppComponent } from './app.component';
import { CardComponent } from './card/card.component';
import { AppRoutingModule } from './/app-routing.module';
import { ManageComponent } from './manage/manage.component';
import { BadgeComponent } from './badge/badge.component';
import { OntologyService } from './ontology.service';
import { InfoResolver } from './info.resolver';
import { OntologyResolver } from './ontology.resolver';
import { OntologiesResolver } from './ontologies.resolver';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { ButtonComponent } from './button/button.component';
import { ShareComponent } from './share/share.component';
import { EditComponent } from './edit/edit.component';
import { AutogrowDirective } from './directives/autogrow.directive';
import { FooterComponent } from './footer/footer.component';
import { PaginationComponent } from './pagination/pagination.component';
import { SearchfilterPipe } from './pipes/searchfilter.pipe';
import { SearchComponent } from './search/search.component';
import { DropdownComponent } from './dropdown/dropdown.component';
import { NewComponent } from './new/new.component';
import { ExtractionComponent } from './extraction/extraction.component';
import { RouterService } from './router.service';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { DpfilterPipe } from './dropdown/dpfilter.pipe';
import { DpListFilterPipe } from './dropdown/dpListFilter.pipe';
import { MapComponent } from './map/map.component';
import { MapResolver } from './map.resolver';
import { HeaderComponent } from './header/header.component';
import { Editv2Component } from './editv2/editv2.component';
import { ListComponent } from './list/list.component';
import { SearchResolver } from './search.resolver';
import { ModalService } from './modal.service';
import { ModalModule } from 'ngx-bootstrap/modal';
import { EditItemComponent } from './edit-item/edit-item.component';
import { ModalTemplateComponent } from './modal-template/modal-template.component';
import { RelGraphComponent } from './rel-graph/rel-graph.component';
import { MetasemnetComponent } from './metasemnet/metasemnet.component';
import { Managev2Component } from './managev2/managev2.component';
import { DamComponent } from './dam/dam.component';

const DEFAULT_DROPZONE_CONFIG: DropzoneConfigInterface = {
  // url: '',
  // maxFilesize: 50,
  // acceptedFiles: '*'
};

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    ManageComponent,
    BadgeComponent,
    BreadcrumbComponent,
    ButtonComponent,
    ShareComponent,
    EditComponent,
    AutogrowDirective,
    FooterComponent,
    PaginationComponent,
    SearchfilterPipe,
    SearchComponent,
    DropdownComponent,
    NewComponent,
    ExtractionComponent,
    DpfilterPipe,
    DpListFilterPipe,
    MapComponent,
    HeaderComponent,
    Editv2Component,
    ListComponent,
    EditItemComponent,
    ModalTemplateComponent,
    RelGraphComponent,
    MetasemnetComponent,
    Managev2Component,
    DamComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule,
    DropzoneModule,
    NgPipesModule,
    NgxSpinnerModule,
    BsDropdownModule.forRoot(),
    AccordionModule.forRoot(),
    SortablejsModule.forRoot({ animation: 150 }),
    BootstrapModule,
    NgSelectModule,
    TinyEditorModule,
    UiSwitchModule,
    PopoverModule.forRoot(),
    ModalModule.forRoot(),
    TabsModule.forRoot(),
    TooltipModule.forRoot(),
  ],
  providers: [
    OntologyService, 
    InfoResolver,
    OntologyResolver,
    OntologiesResolver,
    MapResolver,
    RouterService,
    SearchResolver,
    ModalService,
    {
      provide: DROPZONE_CONFIG,
      useValue: DEFAULT_DROPZONE_CONFIG
    }
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    ModalTemplateComponent,
    DamComponent
  ]
})
export class AppModule { }
