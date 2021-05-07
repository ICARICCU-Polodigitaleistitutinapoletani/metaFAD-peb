import { Component, OnInit, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { Ontology } from '../ontology';
import { OntologyService } from '../ontology.service';

@Component({
  selector: 'app-share',
  templateUrl: './share.component.html',
  styleUrls: ['./share.component.scss']
})
export class ShareComponent implements OnInit {

  ontology: Ontology;
  text: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ontologyService: OntologyService,
    private location: Location
  ) { }

  ngOnInit() {
    this.getOntology();
  }

  getOntology(): void {
    const id = decodeURIComponent(this.route.snapshot.paramMap.get('id'));
    this.ontologyService.getOntology(id)
      .subscribe(ontology => { this.ontology = ontology });
  }

  goBack(): void {
    this.location.back();
  }

  confirm() {
    this.ontologyService.shareOntology(this.ontology.id, true)
      .subscribe(ontology => {
        const baseUrl = window['BASE_ROUTING'] || '';
        this.router.navigate([baseUrl + '/manage'])
      });
  }

}
