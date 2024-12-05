import {afterNextRender, Component, Input} from '@angular/core';
import mermaid from 'mermaid';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-graph-draw',
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: './graph-draw.component.html',
  styleUrl: './graph-draw.component.css'
})
export class GraphDrawComponent {
  @Input() graph: string = '';

  constructor() {
    afterNextRender({
      read: () => {
        void mermaid.init()
      }
    })
  }

  zoom(scale: number) {
    const mermaidElement = document.querySelector('.mermaid') as HTMLElement;
    if (mermaidElement) {
      const currentScale = parseFloat(mermaidElement.style.transform.replace('scale(', '').replace(')', '')) || 1;
      mermaidElement.style.transform = `scale(${currentScale + scale})`;
    }
  }

  rotate() {
    const mermaidElement = document.querySelector('.mermaid') as HTMLElement;
    if (mermaidElement) {
      const currentRotation = parseFloat(mermaidElement.style.transform.replace('rotate(', '').replace('deg)', '')) || 0;
      mermaidElement.style.transform = `rotate(${currentRotation + 90}deg)`;
    }
  }

  handleMouseDown(event: MouseEvent) {
    if (event.button === 0) {
      this.zoom(0.1);
    } else if (event.button === 2) {
      this.zoom(-0.1);
    } else if (event.button === 1) {
      this.rotate();
    }
  }
}

