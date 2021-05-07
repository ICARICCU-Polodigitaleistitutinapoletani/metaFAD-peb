import { Pipe, PipeTransform, Injectable } from '@angular/core';

@Pipe({
  name: 'dpfilter',
  pure: false
})
@Injectable()
export class DpfilterPipe implements PipeTransform {

  transform(items: any, ids: string[]): any {
    if(!ids || !ids.length)
      return items

    return DpfilterPipe.filter(items, ids);
  }

  static filter(items: Array<{ [key: string]: any }>, ids: string[]): Array<{ [key: string]: any }> {
    return items.filter(item => {
      return !ids.includes(item.id);
    });
  }
}
