-- Chats
INSERT INTO petra_api_chat (title, messages, user_id)
VALUES ('Chat 1', '{"questions": ["How are you?"], "answers": ["I am fine."]}', 1),
         ('Chat 2', '{"questions": ["What is your name?"], "answers": ["My name is Petra."]}', 1),
         ('Chat 3', '{"questions": ["What is your favorite color?"], "answers": ["My favorite color is blue."]}', 1);

-- Fine-tuned models
INSERT INTO petra_api_finetunedmodels (id, model_name, model_id, parent_model_id)
VALUES (1, 'ChatGPT 4o default', 'gpt-4o-2024-08-06', ''),
       (2, 'ChatGPT 4o-mini default', 'gpt-4o-mini-2024-07-18', ''),
       (4,'Vállalkozás 3 - WaveMaker Hungary','ft:gpt-4o-mini-2024-07-18:personal::AWJWFBNz', 2);

-- Users
INSERT INTO auth_user(id, password, last_login, is_superuser, username, last_name, email, is_staff, is_active, date_joined, first_name)
VALUES (1,'ASD',1732189581000,1,'Teszt','Teszt','Teszt@Teszt.com',1,1,1732189602000,'asd');
