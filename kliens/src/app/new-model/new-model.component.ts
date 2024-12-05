import {Component, inject, OnInit} from '@angular/core';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatFormField} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {MatProgressBar} from '@angular/material/progress-bar';
import {HttpClient} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf, NgOptimizedImage} from '@angular/common';
import {DataSet, Statistics} from './model.component';
import {tunedModel} from '../new-chat/model.component';
import {ActivatedRoute, Router} from '@angular/router';
import {MatOption, MatSelect} from '@angular/material/select';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import {AuthService} from '../services/auth.service';



@Component({
  selector: 'app-new-context',
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatButton,
    MatCardContent,
    MatCardFooter,
    MatFormField,
    MatInput,
    MatProgressBar,
    FormsModule,
    NgForOf,
    NgIf,
    NgOptimizedImage,
    MatSelect,
    MatOption
  ],
  templateUrl: './new-model.component.html',
  styleUrl: './new-model.component.css'
})
export class NewModelComponent implements OnInit {
  dataText: string = '';
  exampleAmount: number = 10;
  creativity: number = 5;
  modelName: string = '';
  modelId: string | null = '';
  isLoading: boolean = false;
  dataSets: DataSet[] = [];
  fileName: string = '';
  statistics: Statistics =  {sum_cost_of_requests: 0, sum_cost_of_responses: 0, sum_total_tokens: 0, sum_generated_examples: 0};
  isTuning: boolean = false;
  chunkSize: number = 1000;
  private httpClient = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    this.modelId = this.route.snapshot.paramMap.get('id');
    if (this.modelId) {
      this.httpClient.get<tunedModel>(`http://localhost:9090/petra/models/${this.modelId}/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.authService.getToken()}`
        }
      }).subscribe(response => {
        this.modelId = response.model_id;
      });
    }
    //TODO Tuning
  }

  generateDataset(contextText: string, creativity: number, exampleAmount: number) {
    creativity /= 10;
    this.isLoading = true;
    fetch('http://localhost:9090/petra/generate/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.authService.getToken()}`
      },
      body: JSON.stringify({
        'context': contextText,
        'temperature': creativity,
        'examples': exampleAmount,
        'file_name': this.fileName,
        'uid': this.authService.getUid(),
        'chunk_size': this.chunkSize
      })
    }).then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Request failed!');
    }).then(jsonResponse => {
      this.fileName = jsonResponse['training_file_name'];
      //Fetch the generated dataset
      fetch(`http://localhost:9090/petra/datasets/${this.fileName}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.authService.getToken()}`
          }
        },
      ).then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Request failed!');
      }).then(jsonResponse => {
        this.dataSets = jsonResponse['data'];
        this.statistics = jsonResponse['statistics'];
        this.isLoading = false;
      }).catch(networkError => console.log(networkError.message));
    }).catch(networkError => console.log(networkError.message));
  }

  sendToFineTune(dataSets: DataSet[]) {
    let id = this.route.snapshot.paramMap.get('id');
    this.isTuning = true;
    fetch(`http://localhost:9090/petra/models/${id}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.authService.getToken()}`
      },
      body: JSON.stringify({
        'model_name': this.modelName,
        'datasets': dataSets,
        'uid': this.authService.getUid()
      })
    }).then(response => {
      if (response.ok) {
        response.json().then(jsonResponse => {
        this.isTuning = false;
        id = jsonResponse['id'];
        });
      }
      throw new Error('Request failed!');
    }).then(jsonResponse => {
      console.log(jsonResponse);

    }).catch(networkError => console.log(networkError.message));

    this.router.navigate([`/model/$${id}`]).then(r => console.log(r));
  }

  downloadCreatedDataset(dataSets: DataSet[]) {
    const jsonlContent = dataSets.map(dataSet =>
      JSON.stringify(dataSet)
    ).join('\n');

    const blob = new Blob([jsonlContent], {type: 'application/jsonl'});

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  onFileSelected(event: Event): void {
    console.log(event);
    const input = event.target as HTMLInputElement;
    console.log(input);
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const fileType = file.type || file.name.split('.').pop()?.toLowerCase();
      console.log(input.files);
      console.log(fileType);
      switch (fileType) {
        case 'text/plain':
        case 'txt':
          this.readPlainText(file);
          break;
        case 'application/json':
        case 'json':
          this.readJson(file);
          break;
        case 'jsonl':
          this.readJsonl(file);
          break;
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'xlsx':
        case 'xls':
          this.readExcel(file);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'docx':
          this.readDocx(file);
          break;
        case 'application/pdf':
        case 'pdf':
          this.readPdf(file);
          break;
        case 'text/csv':
        case 'csv':
          this.readCsv(file);
          break;
        default:
          alert('Unsupported file type');
      }
    }
  }

  readPlainText(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.dataText = e.target?.result as string;

    };
    reader.readAsText(file);
  }

  readJson(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const jsonObject = JSON.parse(content);
        if (Array.isArray(jsonObject)) {
          this.dataSets = jsonObject.map(item => new DataSet(item.messages));
        } else {
          alert('Invalid JSON file format');
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  readJsonl(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const jsonLines = content
          .split('\n')
          .filter((line) => line.trim() !== '') // Ignore empty lines
          .map((line) => {
            try {
              return JSON.parse(line); // Safely parse each line
            } catch (lineError) {
              console.error('Error parsing line:', line);
              throw new Error('Invalid JSONL content'); // Propagate error to catch block
            }
          });
        this.dataSets = jsonLines.map(item => new DataSet(item.messages));
      } catch (err) {
        console.error(err);
        alert('Invalid JSONL file');
      }
    };
    reader.readAsText(file);
  }

  readExcel(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, {type: 'array'});
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      this.dataText = XLSX.utils.sheet_to_json<string[]>(sheet, {header: 1}).map((row: string[]) => row.join(', ')).join('\n');

    };
    reader.readAsArrayBuffer(file);
  }

  readDocx(file: File): void {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        const result = await mammoth.extractRawText({arrayBuffer});
        this.dataText = result.value; // Extracted text from DOCX

      } catch (err) {
        alert('Error reading DOCX file');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  readPdf(file: File): void {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
      let extractedText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedText += pageText + '\n';
      }
      this.dataText = extractedText;


    };
    reader.readAsArrayBuffer(file);
  }

  readCsv(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.dataText = e.target?.result as string;

    };
    reader.readAsText(file);
  }



  dateSetted(event: Event) {

  }

  protected readonly Math = Math;
}
