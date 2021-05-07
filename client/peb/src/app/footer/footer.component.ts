import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {

  @Output() onSave = new EventEmitter();

  constructor() { }

  ngOnInit() {
  }

  save() {
    this.onSave.emit();
  }

}
