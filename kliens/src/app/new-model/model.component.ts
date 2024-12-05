export class DataSet{
  messages: trainingExample[];

  constructor(messages: trainingExample[]){
    this.messages = messages;
  }
}

export class trainingExample {
  role: string;
  content: string;

  constructor(role: string, content: string) {
    this.role = role;
    this.content = content;
  }
}

export class Statistics{
  sum_cost_of_requests: number;
  sum_cost_of_responses: number;
  sum_total_tokens: number;
  sum_generated_examples: number;

  constructor(sum_cost_of_requests: number, sum_cost_of_responses: number, sum_total_tokens: number, sum_generated_examples: number){
    this.sum_cost_of_requests = sum_cost_of_requests;
    this.sum_cost_of_responses = sum_cost_of_responses;
    this.sum_total_tokens = sum_total_tokens;
    this.sum_generated_examples = sum_generated_examples;
  }
}
