
export class Chat {
    id: number;
    title: string;
    messages: Messages[];

    constructor(id: number, title: string, messages: Messages[]) {
        this.id = id;
        this.title = title;
        this.messages = messages;
    }
}

export class Messages{
    Questions: string;
    Answers: string;

    constructor(user: string, message: string) {
      this.Questions = user;
      this.Answers = message;
    }
}
