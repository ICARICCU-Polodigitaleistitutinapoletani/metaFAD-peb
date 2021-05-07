import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-dam',
  templateUrl: './dam.component.html',
  styleUrls: ['./dam.component.scss']
})
export class DamComponent implements OnInit {

  src;
  closeBtn;

  constructor(
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.src = this.sanitizer.bypassSecurityTrustResourceUrl(this.src);
  }

}
