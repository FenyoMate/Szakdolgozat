from django.urls import path

from auth.views.auth_views import LoginView, RegisterView, UserView, LogoutView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('register/', RegisterView.as_view(), name='register'),
    path('user/<int:user_id>/', UserView.as_view(), name='user_by_id'),


]

