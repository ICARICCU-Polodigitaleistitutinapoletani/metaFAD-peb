import { Component, OnInit, Input, EventEmitter } from '@angular/core';
import * as graphlibDot from 'graphlib-dot';
import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';
import * as $ from 'jquery';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rel-graph',
  templateUrl: './rel-graph.component.html',
  styleUrls: ['./rel-graph.component.scss']
})
export class RelGraphComponent implements OnInit {

  @Input() redraw: EventEmitter<void>;
  @Input() graph: string;
  private subscriptions: Subscription[] = [];

  constructor() {
    
  }

  ngOnInit() {
    console.log(this, this.redraw);
    this.subscriptions.push(
      this.redraw.subscribe(() => this.redrawGraph())
    );
  }

  redrawGraph() {
    setTimeout(() => {
      let g;
      try {
        // g = graphlibDot.read(`digraph g {     
        //     "Boredom" [label="Boredom"];
        //     "Boredom" -> "Low" [label="hasEmoScore" ];
        //     "Low" [label="Low"];
        //     "Contempt" [label="Contempt"];
        //     "Contempt" -> "Anger" [label="isEmoComposedOf" ];
        //     "Anger" [label="Anger"];
        //     "Contempt" -> "Disgust" [label="isEmoComposedOf" ];
        //     "Disgust" [label="Disgust"];
        //     "Annoyance" [label="Annoyance"];
        //     "Annoyance" -> "Low" [label="hasEmoScore" ];
        //     }`);
        g = graphlibDot.read(this.graph);
      } catch (e) {
        alert('Errore di caricamento del grafo!');
        throw e;
      }
      if (g) {

        g.nodes().forEach(function(v) {
          var node = g.node(v);
          node.shape = "ellipse";
        });

        g.edges().forEach(function(v) {
          var edge = g.edge(v);
          edge.curve = d3.curveBasis;
        });

        const render = new dagreD3.render();
        $('svg').empty();
        const svg = d3.select('svg'),
        svgGroup = svg.append('g');
        render(d3.select('svg g'), g);
        const parentWidth = $('.rel-graph-container').width();
        const w = (parentWidth < (g.graph().width + 50)) ? (g.graph().width + 50) : parentWidth;
        svg.attr('width', w);
        const xCenterOffset = (svg.attr('width') - g.graph().width) / 2;
        svgGroup.attr('transform', 'translate(' + xCenterOffset + ', 20)');
        svg.attr('height', g.graph().height + 40);
      }
    }, 500);
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
