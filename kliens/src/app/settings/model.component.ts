export class User {
  username: string

  constructor(username: string) {
    this.username = username;
  }
}

export class Statistics{
  total_chat_cost: number;
  total_dataset_cost: number;
  total_tuning_cost: number;

  constructor(total_chat_cost: number, total_dataset_cost: number, total_tuning_cost: number){
    this.total_chat_cost = total_chat_cost;
    this.total_dataset_cost = total_dataset_cost;
    this.total_tuning_cost = total_tuning_cost;
  }
}
