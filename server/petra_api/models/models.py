from django.db import models
from django.contrib.auth.models import User


class Chat(models.Model):
    title = models.CharField(max_length=100)
    messages = models.JSONField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, default=None)

class FineTunedModels(models.Model):
    model_name = models.CharField(max_length=100)
    model_id = models.CharField(max_length=100)
    parent_model_id = models.CharField(max_length=100)

class DataSetGenerationStatistics(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, default=None)
    job_id = models.CharField(max_length=100)
    date = models.DateTimeField(auto_now_add=True)
    cost_of_requests = models.IntegerField()
    cost_of_responses = models.IntegerField()
    generated_examples = models.IntegerField()
    total_tokens = models.IntegerField()

class TuningStatistics(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, default=None)
    job_id = models.CharField(max_length=100)
    tuning_data_estimated_cost = models.IntegerField()
    tuning_data_cost = models.IntegerField()
    examples_used = models.IntegerField()
    training_epochs = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)
