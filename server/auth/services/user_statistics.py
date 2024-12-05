from petra_api.models.models import TuningStatistics, DataSetGenerationStatistics, Chat
from petra_api.models.serializers import DataSetGenerationStatisticsSerializer, TuningStatisticsSerializer, \
    ChatSerializer
from petra_api.services.ai import encoding

def fetch_statistics(user):
    tuning_statistics = TuningStatistics.objects.filter(user=user)
    dataset_generation_statistics = DataSetGenerationStatistics.objects.filter(user=user)
    chats = Chat.objects.filter(user=user)
    ts_serializer = TuningStatisticsSerializer(tuning_statistics, many=True)
    dgs_serializer = DataSetGenerationStatisticsSerializer(dataset_generation_statistics, many=True)
    chat_serializer = ChatSerializer(chats, many=True)

    dataset_costs = 0
    tuning_costs = 0
    chat_costs = 0
    for chat in chat_serializer.data:
        questions = chat['messages'].get('questions', '')
        answers = chat['messages'].get('answers', '')
        for q in questions:
            chat_costs += len(encoding.encode(q))
        for a in answers:
            chat_costs += len(encoding.encode(a))
    for ds in dgs_serializer.data:
        dataset_costs += ds['total_tokens']
    for ts in ts_serializer.data:
        tuning_costs += ts['tuning_data_cost']
    return {
        'total_chat_cost': chat_costs,
        'total_dataset_cost': dataset_costs,
        'total_tuning_cost': tuning_costs
    }