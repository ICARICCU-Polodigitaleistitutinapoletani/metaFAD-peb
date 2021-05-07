import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss']
})
export class ButtonComponent implements OnInit {
  @Input() label: string;
  @Input() type: string;
  @Output() onClick = new EventEmitter<string>();

  constructor() { }

  ngOnInit() {
  }

  click(t: string) {
    this.onClick.emit(t);
  }

}
