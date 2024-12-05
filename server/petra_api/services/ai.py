import json
import os
import random
import time
import openai
import pandas as pd
import tiktoken

from collections import defaultdict
from tenacity import retry, stop_after_attempt, wait_exponential
from petra_api.models.models import TuningStatistics, DataSetGenerationStatistics
from petra_api.utils.key import Key

openai.api_key = Key

def setApiKey(key):
    openai.api_key = key

N_RETRIES = 3

encoding = tiktoken.get_encoding('o200k_base')

def process(request, conversation):
    response = openai.ChatCompletion.create(
        model=request["usedModel"],
        messages=[
            {"role": "system", "content": "You are a helpful assistant. You must give detailed and structured answers to the user's questions!\n If the user requests a chart, then you should create it in mermaid language. You have to give description for the chart too. You should place the generated mermaid code at the end of the message!\n Your conversations before: \n" + conversation},
            {"role": "user", "content": request["message"]}
        ],
        max_tokens=10000,
        temperature=0.5,
        stream = True
    )
    print(response)
    def response_generator():
        for chunk in response:
            content = chunk['choices'][0]['delta'].get('content', '')
            if content:
                yield content

    return response_generator()

def generate_system_message(context, temperature, stats):
    system_message = "You will be given a description of the model we are training, and from that, you will generate a complex system prompt for that model to use. Remember, you are not generating the system message for data generation -- you are generating the system message to use for inference. A good format to follow is `Given $INPUT_DATA, you will $WHAT_THE_MODEL_SHOULD_DO.`.\n\nMake it as concise as possible. Include nothing but the system prompt in your response.\n\nFor example, never write: `\"$SYSTEM_PROMPT_HERE\"`.\n\nIt should be like: `$SYSTEM_PROMPT_HERE`."
    response = openai.ChatCompletion.create(
        model="gpt-4o-2024-08-06",
        messages=[
          {
            "role": "system",
            "content": system_message
          },
          {
              "role": "user",
              "content": context,
          }
        ],
        temperature=temperature,
        max_tokens=1000,
    )
    tokens = len(encoding.encode(system_message))
    tokens += len(encoding.encode(context))
    stats['total_dataset_generation_request_tokens'] += tokens
    tokens = len(encoding.encode(response.choices[0].message['content']))
    stats['total_dataset_generation_response_tokens'] += tokens
    return response.choices[0].message['content']

@retry(stop=stop_after_attempt(N_RETRIES), wait=wait_exponential(multiplier=1, min=4, max=70))
def generate_dataset(prompt, prev_examples, temperature, stats):
    system_message = (
    f"You are generating data which will be used to train a machine learning model.\n\n"
    f"You have to be specific, but your new model will have to be creative too!\n\n"
    f"You will be given a description of the model we want to train, and from that, you will generate data samples, each with a prompt/response pair.\n\n"
    f"You will do so in this format:\n```\nprompt\n-----------\n$prompt_goes_here\n-----------\n\nresponse\n-----------\n$response_goes_here\n-----------\n```\n\n"
    f"The format is very important!!!\n\n"
    f"Only one prompt/response pair should be generated per turn.\n\nFor each turn, make the example slightly more complex than the last, while ensuring diversity.\n\n"
    f"Make sure your samples are unique and diverse, yet high-quality and complex enough to train a well-performing model.\n\nHere is the type of model we want to train:\n`{prompt}`"
    )

    messages=[
        {
            "role": "system",
            "content": system_message
        }
    ]
    tokens = 0
    for line in system_message.split("\n\n"):
        tokens += len(encoding.encode(line))

    if len(prev_examples) > 0:
        if len(prev_examples) > 5:
            prev_examples = random.sample(prev_examples, 5)
        for example in prev_examples:
            messages.append({
                "role": "assistant",
                "content": example
            })
            tokens += len(encoding.encode(example))

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini-2024-07-18",
        messages=messages,
        temperature=temperature,
        max_tokens=800,
    )

    stats['total_dataset_generation_request_tokens'] += tokens
    tokens = len(encoding.encode(response.choices[0].message['content']))
    stats['total_dataset_generation_response_tokens'] += tokens
    stats['examples_generated'] += 1
    return response.choices[0].message['content']


def convert_context_to_dataset(context, temperature, examples, filename, user):
    prev_examples = []
    prompts = []
    responses = []
    stats = {'total_dataset_generation_request_tokens': 0,'total_dataset_generation_response_tokens': 0, 'examples_generated': 0}

    system_message=generate_system_message(context, temperature, stats)
    for i in range(examples):
        print(f'Generating example {i}')
        dataset = generate_dataset(context, prev_examples, temperature, stats)
        prev_examples.append(dataset)

    for example in prev_examples:
        try:
            split_example = example.split('-----------')
            if len(split_example) >= 4:  # Check if the format is as expected
                prompts.append(split_example[1].strip())
                responses.append(split_example[3].strip())
            else:
                print(f"Skipping example due to unexpected format: {example}")
        except Exception as e:
            print(f"Error processing example: {example}, Error: {e}")

    # Create a DataFrame
    df = pd.DataFrame({
        'prompt': prompts,
        'response': responses
    })

    # Remove duplicates
    df = df.drop_duplicates()

    # Initialize list to store training examples
    training_examples = []
    tokens = 0

    for index, row in df.iterrows():
        training_example = {
            "messages": [
                {"role": "system", "content": system_message.strip()},
                {"role": "user", "content": row['prompt']},
                {"role": "assistant", "content": row['response']}
            ]
        }
        training_examples.append(training_example)

    dataset_format_errors = validate_training_dataset(training_examples)
    training_data_estimated_token_cost = num_tokens_from_messages(training_examples[0]['messages'])

    statistics = {
        'requested_examples': examples,
        'characters_in_context': len(context),
        'generated_examples': stats['examples_generated'],
        'cost_of_requests': stats['total_dataset_generation_request_tokens'],
        'cost_of_responses': stats['total_dataset_generation_response_tokens'],
        'cost_of_dataset_generation': stats['total_dataset_generation_request_tokens'] + stats['total_dataset_generation_response_tokens'],
        'generated_dataset_token_value:': dataset_value_calculator(training_examples),
        'estimated_training_data_token_cost': training_data_estimated_token_cost,
        'total_tokens': stats['total_dataset_generation_request_tokens'] + stats['total_dataset_generation_response_tokens'] + training_data_estimated_token_cost,
    }

    collect_dataset_gen_statistics(filename, statistics, user)

    with (open(filename, 'a')) as f:
        for example in training_examples:
            f.write(json.dumps(example) + '\n')


    res = {
        'training_file_name': filename,
        'errors': dataset_format_errors
    }
    return res

def fine_tune_model(model_id, training_data, user):
    filename = f'trainingfile_{random.randint(0, 100000)}.jsonl'
    with open(filename, 'w') as file:
        for example in training_data:
            file.write(json.dumps(example) + '\n')

    if len(training_data) - validate_training_dataset(training_data) < 10:
        return {'error': 'You need at least 10 correctly formatted examples to fine-tune a model'}
    if len(training_data) < 10:
        return {'error': 'You need at least 10 examples to fine-tune a model'}

    token_limit = 65000
    current_token_count = 0
    for message in training_data:
        current_token_count += num_tokens_from_messages(message['messages'])
    estimated_cost = current_token_count*3

    if current_token_count > token_limit:
        chunks = split_training_data(training_data, token_limit)
        fine_tuned_models = []

        for i, chunk in enumerate(chunks):
            temp_file = f'temp_chunk_{random.randint(0, 100000)}.jsonl'
            with open(temp_file, 'w') as f:
                for example in chunk:
                    f.write(json.dumps(example) + '\n')

            file_id = openai.File.create(
                file=open(temp_file, "rb"),
                purpose='fine-tune'
            ).id

            job = openai.FineTuningJob.create(
                training_file=file_id,
                model=model_id
            )
            job_id = job.id

            while True:
                job_status = openai.FineTuningJob.retrieve(job_id)
                if job_status.status == 'succeeded':
                    fine_tuned_model = job_status['fine_tuned_model']
                    model_id = fine_tuned_model
                    fine_tuned_models.append(fine_tuned_model)
                    stat = TuningStatistics.objects.create(
                        job_id=fine_tuned_model,
                        tuning_data_estimated_cost=estimated_cost,
                        tuning_data_cost=job_status['trained_tokens'],
                        examples_used=len(training_data),
                        training_epochs=3,
                        user=user
                    )
                    stat.save()
                    break
                elif job_status.status == 'failed':
                    return {'error': f'Fine-tuning job failed for chunk {i}'}
                else:
                    print(f"Job status for chunk {i}: {job_status.status}. Waiting for completion...")
                    time.sleep(30)
            os.remove(temp_file)
        return {'model_id': fine_tuned_models[-1]}
    else:
        file_id = openai.File.create(
            file=open(filename, "rb"),
            purpose='fine-tune'
        ).id
        job = openai.FineTuningJob.create(
            training_file=file_id,
            model=model_id
        )
        job_id = job.id
        while True:
            job_status = openai.FineTuningJob.retrieve(job_id)
            if job_status.status == 'succeeded':
                stat = TuningStatistics.objects.create(
                    job_id=job_status['fine_tuned_model'],
                    tuning_data_estimated_cost=estimated_cost,
                    tuning_data_cost=job_status['trained_tokens'],
                    examples_used=len(training_data),
                    training_epochs=3,
                    user=user
                )
                stat.save()
                return {'model_id': job_status['fine_tuned_model']}
            elif job_status.status == 'failed':
                return {'error': 'Fine-tuning job failed'}
            else:
                print(f"Job status: {job_status.status}. Waiting for completion...")
                time.sleep(30)


def split_training_data(training_examples, token_limit):
    chunks = []
    current_chunk = []
    current_token_count = 0

    for example in training_examples:
        example_token_count = num_tokens_from_messages(example['messages'])
        if current_token_count + example_token_count > token_limit:
            chunks.append(current_chunk)
            current_chunk = []
            current_token_count = 0

        current_chunk.append(example)
        current_token_count += example_token_count

    if current_chunk:
        chunks.append(current_chunk)

    return chunks

def validate_training_dataset(dataset):
    format_errors = defaultdict(int)

    for ex in dataset:
        if not isinstance(ex, dict):
            format_errors["data_type"] += 1
            continue

        messages = ex.get("messages", None)
        if not messages:
            format_errors["missing_messages_list"] += 1
            continue

        for message in messages:
            if "role" not in message or "content" not in message:
                format_errors["message_missing_key"] += 1

            if any(k not in ("role", "content", "name", "function_call", "weight") for k in message):
                format_errors["message_unrecognized_key"] += 1

            if message.get("role", None) not in ("system", "user", "assistant", "function"):
                format_errors["unrecognized_role"] += 1

            content = message.get("content", None)
            function_call = message.get("function_call", None)

            if (not content and not function_call) or not isinstance(content, str):
                format_errors["missing_content"] += 1

        if not any(message.get("role", None) == "assistant" for message in messages):
            format_errors["example_missing_assistant_message"] += 1

    if format_errors:
        print("Found errors:")
        for k, v in format_errors.items():
            print(f"{k}: {v}")
            return len(format_errors)
    else:
        print("No errors found")
        return 0

def num_tokens_from_messages(messages, tokens_per_message=3, tokens_per_name=1):
    num_tokens = 0
    for message in messages:
        for key, value in message.items():
            num_tokens += len(encoding.encode(value))
            if key == "role":
                num_tokens += 1
    return num_tokens


def create_chunks(context, chunk_limit=1000):
    context_chunks = context.split('\n\n')
    concatenated_chunks = []
    current_chunk = ""
    current_length = 0

    for chunk in context_chunks:
        chunk_length = len(encoding.encode(chunk))
        if current_length + chunk_length < chunk_limit:
            current_chunk += chunk + '\n\n'
            current_length += chunk_length
        else:
            concatenated_chunks.append(current_chunk.strip())
            current_chunk = chunk + '\n\n'
            current_length = chunk_length

    if current_chunk:
        concatenated_chunks.append(current_chunk.strip())

    return concatenated_chunks


def collect_dataset_gen_statistics(job_id, stats, user):
    job = DataSetGenerationStatistics.objects.create(
        job_id=job_id,
        cost_of_requests=stats['cost_of_requests'],
        cost_of_responses=stats['cost_of_responses'],
        generated_examples=stats['generated_examples'],
        total_tokens=stats['total_tokens'],
        user=user
        )
    job.save()

def dataset_value_calculator(training_data):
    total_tokens = 0
    for example in training_data:
        for message in example['messages']:
            for key, value in message.items():
                if key != 'role':
                    total_tokens += len(encoding.encode(value))

    return total_tokens