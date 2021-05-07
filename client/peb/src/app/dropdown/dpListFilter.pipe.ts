import { Pipe, PipeTransform, Injectable } from '@angular/core';

@Pipe({
  name: 'dpListFilter',
  pure: false
})
@Injectable()
export class DpListFilterPipe implements PipeTransform {

  transform(list: any, text: string): any {
    return list ? list.filter(item => item.type.search(new RegExp(text, 'i')) == 0) : [];
  }
}
