from rest_framework import serializers

from petra_api.models.models import Chat, FineTunedModels


class ChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = '__all__'

class FineTunedModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = FineTunedModels
        fields = '__all__'

class TuningStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FineTunedModels
        fields = '__all__'

class DataSetGenerationStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FineTunedModels
        fields = '__all__'