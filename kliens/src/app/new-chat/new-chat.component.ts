import {afterNextRender, AfterViewChecked, AfterViewInit, Component, inject, OnInit} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MatButton, MatIconButton} from '@angular/material/button';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {tunedModel} from './model.component';
import {AuthService} from '../services/auth.service';
import {marked} from 'marked';
import mermaid from 'mermaid';
import {GraphDrawComponent} from './graph-draw/graph-draw.component';

function removeMermaid(content: string[]){
  return content.map((value) => {
    return value.replace(/```mermaid[\s\S]*?```/g, '');
  });
}

function extractMermaid(content: string[]){
  const mermaidRegex = /```mermaid[\s\S]*?```/g;
  const matches = content.map((value) => {
    return value.match(mermaidRegex);
  });


  return matches.map((value) => {
    if (value && value.length > 0) {
      let res = value.map((v) => v.replace(/```mermaid|```/g, '')).join('\n');
      return res;
    }
    return '';
  });
}

@Component({
  selector: 'app-new-chat',
  standalone: true,
  imports: [
    MatIcon,
    MatIconButton,
    NgForOf,
    RouterModule,
    FormsModule,
    MatMenu,
    MatMenuItem,
    MatButton,
    MatMenuTrigger,
    NgIf,
    GraphDrawComponent
  ],
  templateUrl: './new-chat.component.html',
  styleUrl: './new-chat.component.css'
})
export class NewChatComponent implements OnInit, AfterViewInit  {
  private httpClient = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  messages: { questions: string[], answers: string[]} = {questions: [], answers: []};
  hasRenderedMermaid = false;
  graphs: string[] = [];
  id: string | null = '';
  newQuestion: string = '';
  models: tunedModel[] = [];
  selectedModel = 'Select model';
  selectedModelId = '';
  isMermaid = false;
  graphFetched = false;
  ngAfterViewInit() {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default'
    });
    this.hasRenderedMermaid = true;
  }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.httpClient.get<any>(`http://localhost:9090/petra/chat/${this.id}/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.authService.getToken()}`
        }
      }).subscribe(response => {
        this.messages.questions = response.messages.questions;
        this.messages.answers = removeMermaid(response.messages.answers);
        this.graphs = extractMermaid(response.messages.answers);
        this.hasRenderedMermaid = false;
      });
    }
    this.httpClient.get<tunedModel[]>('http://localhost:9090/petra/models/list/', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.authService.getToken()}`
      }
    }).subscribe(response => {
      for (let i = 0; i < response.length; i++) {
        this.models = response;
      }
    });
  }

  renderMarkdown(content: string) {
    return marked(content);
  }

  sendMessage(newQuestion: string) {
    this.hasRenderedMermaid = false;
    this.messages.questions.push(newQuestion);
    const currentIndex = this.messages.questions.length - 1;
    if (this.selectedModel === 'Select model' || this.selectedModel === '') {
      this.messages.answers[currentIndex] = 'Please select a model!';
      return;
    }

    this.messages.answers[currentIndex] = '';

    fetch(`http://localhost:9090/petra/chat/${this.id}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.authService.getToken()}`
      },
      body: JSON.stringify(
        {
          message: newQuestion,
          usedModel: this.selectedModelId
        }
      ),
    })
      .then(async (response) => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
          const {done, value} = await reader?.read()!;
          if (done) {
            break;
          }
          const chunk = decoder.decode(value, {stream: true});
          this.messages.answers[currentIndex] += chunk;
        }
        fetch(`http://localhost:9090/petra/chat/save/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.authService.getToken()}`
          },
          body: JSON.stringify(
            {
              id: this.id,
              question: newQuestion,
              answer: this.messages.answers[currentIndex]
            }),
        }).then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Request failed!');
        })
          .catch((error) => {
            console.error('Error saving chat:', error);
          }).then((jsonResponse) => {
            console.log(jsonResponse['costs']);
        })
        ;
      })
      .catch((error) => {
        console.error('Streaming error:', error);
        this.messages.answers[currentIndex] = 'An error occurred.';
      });
    this.newQuestion = '';
  }

  selectModel(modelName: string, modelId: string) {
    this.selectedModel = modelName;
    this.selectedModelId = modelId;
  }



}
