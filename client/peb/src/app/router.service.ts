import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

@Injectable()
export class RouterService {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) { }

  goTo(url, params?) {
    const baseUrl = window['BASE_ROUTING'] ? `${window['BASE_ROUTING']}/` : '';
    url = baseUrl + url;
    let route = [url];
    if(params) {
      params.forEach(param => {
        route.push(encodeURIComponent(param));
      });
    }
    this.router.navigate(route);
  }

  back() {
    this.location.back();
  }

}
