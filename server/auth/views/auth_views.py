from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from auth.services.user_statistics import fetch_statistics


class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(username=username, password=password, email=email)
        user.save()
        return Response({}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user is not None:
            token, _ = Token.objects.get_or_create(user=user)
            user = get_object_or_404(User, username=username)
            return Response({'token': token.key, 'uid': user.id}, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

class UserView(APIView):
    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        statistics = fetch_statistics(user)
        return Response({
            'username': user.username,
            'email': user.email,
            'statistics': statistics
        }, status=status.HTTP_200_OK)

    def put(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        print(request.data)
        user.set_password(request.data['new_password'])
        user.save()
        return Response({}, status=status.HTTP_200_OK)

class LogoutView(APIView):
    def post(self, request):
        request.user.auth_token.delete()
        return Response({}, status=status.HTTP_200_OK)