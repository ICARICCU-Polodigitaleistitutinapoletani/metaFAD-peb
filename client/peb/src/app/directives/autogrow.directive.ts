import { ElementRef, HostListener, Directive, AfterContentChecked, Input } from '@angular/core';

@Directive({
  selector: '[appAutogrow]'
})
export class AutogrowDirective implements AfterContentChecked {

  @Input() extraWidth = 4;

  @HostListener('input', ['$event.target'])
  public onInput(event: any): void {
      this.adjustWidth();
  }

  constructor(public element: ElementRef) {
  }

  ngAfterContentChecked(): void {
      this.adjustWidth();
  }

  adjustWidth(): void {
      const style = window.getComputedStyle(this.element.nativeElement, '').getPropertyValue('font-size');
      const fontFamily = window.getComputedStyle(this.element.nativeElement, '').getPropertyValue('font-family');
      const fontSize = parseFloat(style);
      const extraWidthCalculated = this.getTextWidth('_', fontSize, fontFamily) * this.extraWidth;
      this.element.nativeElement.style.width = this.getTextWidth(this.element.nativeElement.value, fontSize, fontFamily)
          + extraWidthCalculated + 'px';
  }

  getTextWidth(value: string, fontSize: any, fontFamily: string) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx!.font = `${fontSize}px ${fontFamily}`;
      return ctx!.measureText(value).width;
  }

}
