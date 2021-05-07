import { Pipe, PipeTransform, Injectable } from '@angular/core';

@Pipe({
  name: 'searchfilter',
  pure: false
})
@Injectable()
export class SearchfilterPipe implements PipeTransform {

  transform(items: any, search: { [key: string]: any }, type: string, lang: string): any {
    if(type) {
      if(type === 'ontology') {
        if ((!search.term && !search.type && !search.entity) || !items) return items;
      }
    } else {
      if (!search.term || !items) return items;
    }

    return SearchfilterPipe.filter(items, search, type, lang);
  }

  static filter(items: Array<{ [key: string]: any }>, search: { [key: string]: any }, type: string, lang: string): Array<{ [key: string]: any }> {

    const toCompare = search.term.toLowerCase();

    return items.filter(function (item: any) {
      let check;
      if(type) {
        if(type === 'ontology') {
          if(!item.name[lang])
            return false;
          let check = item.name[lang].toString().toLowerCase().includes(toCompare);
          if(search.type)
            check = check && item.type === search.type;
          if(search.entity)
            check = check && item.superclass && item.superclass.value === search.entity;
          return check;
        }
      } else {
        for (let property in item) {
          if (item[property] === null) {
            continue;
          }
          if (item[property].toString().toLowerCase().includes(toCompare)) {
            return true;
          }
        }
      }
      return false;
    });
  }
}
