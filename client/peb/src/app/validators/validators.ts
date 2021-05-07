import { AbstractControl } from "@angular/forms";
import * as $ from 'jquery';

export function mceRequiredValidator(control: AbstractControl) {
  console.log('validation mce', control.value)
  if (!control.value || !$('<span>'+control.value+'</span>').text().length) {
    return { required: true};
  }
  return null;
}

export function ngSelectRequiredValidator(control: AbstractControl) {
  console.log('validation', control.value)
  if (!control.value.length) {
    return { required: true, ciao2: 'CIAO2' };
  }
  return null;
}