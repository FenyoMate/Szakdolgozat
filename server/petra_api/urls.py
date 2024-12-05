from django.urls import path

from petra_api.views.petra_views import ListAllChat, NewChat, DoChat, ListAllFineTunedModels, SaveChat, GenerateDataset, \
    GetFineTunedModel, \
    ModelUsageStatistics, FetchDataset

urlpatterns = [
    # Chat related endpoints
    path('chats/<int:user_id>/', ListAllChat.as_view(), name='list_all_chat'),
    path('chat/new/', NewChat.as_view(), name='new_chat'),
    path('chat/save/', SaveChat.as_view(), name='save_chat'),
    path('chat/<int:chat_id>/', DoChat.as_view(), name='chat_with_gpt'),

    # Model related endpoints
    # path('generate/', GenerateDataset.as_view(), name = 'generate_dataset'),
    path('models/list/', ListAllFineTunedModels.as_view(), name='list_all_models'),
    path('models/<int:model_id>/', GetFineTunedModel.as_view(), name='get_model'),

    # Fine-tuned model options related endpoints
    path('generate/', GenerateDataset.as_view(), name='generate_dataset'),
    path('datasets/<str:filename>/', FetchDataset.as_view(), name='fetch_dataset'),
    path('statistics/<int:model_id>/', ModelUsageStatistics.as_view(), name='generate_statistics'),
  #  path('api/setkey/', SetKey.as_view(), name='set_key'),

]
