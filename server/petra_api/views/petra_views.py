import json
from random import randint

from django.contrib.auth.models import User
from django.db.models import Sum
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from petra_api.models.models import Chat, FineTunedModels, TuningStatistics, DataSetGenerationStatistics
from petra_api.models.serializers import ChatSerializer, FineTunedModelSerializer, DataSetGenerationStatisticsSerializer
from petra_api.services.ai import process, create_chunks, convert_context_to_dataset, \
    fine_tune_model, encoding


#TODO permission handling!!!!
# permission_classes = [permissions.IsAuthenticated]

## CHAT ENDPOINTS
# host/petra/chats/{uid}/
class ListAllChat(APIView):
    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        chats = Chat.objects.filter(user_id=user)
        serializer = ChatSerializer(chats, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

# host/petra/chat/{id}/


class DoChat(APIView):
    def get(self, request, chat_id):
        chat = get_object_or_404(Chat, pk=chat_id)
        serializer = ChatSerializer(chat)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, chat_id):
        try:
            chat = get_object_or_404(Chat, pk=chat_id)
            conversation = build_conversation(chat.messages)
            response = StreamingHttpResponse(
                process(request.data, conversation),
                content_type='text/plain',
            )
            response['Cache-Control'] = 'no-cache'
            return response
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    def delete(self, request, chat_id):
        chat = get_object_or_404(Chat, pk=chat_id)
        print("Deleting chat")
        chat.delete()
        return Response({}, status=status.HTTP_200_OK)

# host/petra/chat/save/
class SaveChat(APIView):
    def post(self, request):
        chat = get_object_or_404(Chat, pk=request.data.get("id"))
        if chat.messages["questions"] == []:
            chat.title = ' '.join(request.data.get("question").split()[:5])+'...'
            print(chat.title)
        chat.messages["answers"].append(request.data.get("answer"))
        chat.messages["questions"].append(request.data.get("question"))
        costs = {
            "cost_of_request": len(encoding.encode(request.data.get("question"))),
            "cost_of_response": len(encoding.encode(request.data.get("answer")))
        }
        chat.save()
        return Response({"costs": costs}, status=status.HTTP_200_OK)

# host/petra/chat/new/
class NewChat(APIView):
    def post(self, request):
        title = 'New chat'
        messages = {"questions": [], "answers": []}
        user = get_object_or_404(User, id=request.data['uid'])
        chat = Chat.objects.create(title=title, messages=messages, user_id=user.id)
        serializer = ChatSerializer(chat)
        return Response(serializer.data['id'], status=status.HTTP_201_CREATED)

## FINE-TUNING ENDPOINTS
# host/petra/models/list/
class ListAllFineTunedModels(APIView):
    def get(self, request):
        models = FineTunedModels.objects.all()
        serializer = FineTunedModelSerializer(models, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

# host/petra/models/{id}/
class GetFineTunedModel(APIView):

    def get(self, request, model_id):
        model = get_object_or_404(FineTunedModels, pk=model_id)
        serializer = FineTunedModelSerializer(model)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, model_id):
        model = get_object_or_404(FineTunedModels, pk=model_id)
        user = get_object_or_404(User, pk=request.data['uid'])
        response = fine_tune_model(model.model_id, request.data['datasets'], user)
        model = FineTunedModels.objects.create(model_name=request.data['model_name'], model_id=response['model_id'], parent_model_id=model_id)
        model.save()
        if model is None:
            return Response({}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'id': model.id}, status=status.HTTP_201_CREATED)


# host/petra/models/statistics/{id}/
class ModelUsageStatistics(APIView):
    def get(self, request, model_id):
        model = get_object_or_404(FineTunedModels, pk=model_id)
        statistics = {
            "tuning_statistics": TuningStatistics.objects.filter(model_id=model.model_id).values(),
            "dataset_generation_statistics": DataSetGenerationStatistics.objects.filter(model_id=model_id.model_id).values()
        }
        return Response(statistics, status=status.HTTP_200_OK)

# host/petra/generate/
class GenerateDataset(APIView):
    def post(self, request):
        user = get_object_or_404(User, pk=request.data['uid'])
        context_chunks = create_chunks(request.data['context'], request.data['chunk_size'])
        if request.data['file_name'] == '':
            filename = 'trainingfile' + str(randint(0, 100000)) + '.jsonl'
            open(filename, 'w')
        else:
            filename = request.data['file_name']
        for chunks in context_chunks:
            convert_context_to_dataset(chunks, request.data['temperature'], request.data['examples'],filename, user)
        return Response({'training_file_name': filename}, status=status.HTTP_200_OK)

class FetchDataset(APIView):
    permission_classes = [AllowAny]
    def get(self, request, filename):
        ds_statistics = DataSetGenerationStatistics.objects.filter(job_id=filename).aggregate(sum_cost_of_requests=Sum('cost_of_requests'), sum_cost_of_responses=Sum('cost_of_responses'), sum_total_tokens=Sum('total_tokens'), sum_generated_examples=Sum('generated_examples'))
        if not ds_statistics:
            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        print(ds_statistics)
        try:
            with open(filename, 'r') as file:
                serialized_data = [json.loads(line) for line in file]
                response = {
                    "statistics": ds_statistics,
                    "data": serialized_data
                }
            return Response(response, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except json.JSONDecodeError:
            return Response(
                {"error": "Error parsing the JSONL file"},
                status=status.HTTP_400_BAD_REQUEST
            )

# host/petra/api/setkey/
class SetKey(APIView):
    def post(self, request):
        user = get_object_or_404(User, pk=request.data['uid'])
        user.api_key = request.data['key']
        user.save()
        return Response({}, status=status.HTTP_200_OK)

# Other functions:
def build_conversation(messages):
    conversation = ""
    for i in range(len(messages["questions"])):
        conversation += messages["questions"][i] + "\n"
        conversation += messages["answers"][i] + "\n"
    return conversation