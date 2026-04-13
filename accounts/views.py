from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from services.odoo_auth import authenticate_with_odoo
from .permissions import IsAnyRole

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login = request.data.get("login")
        password = request.data.get("password")
        
        if not login or not password:
            return Response({"error": "Login and password are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        profile = authenticate_with_odoo(login, password)
        if not profile:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Create token
        refresh = RefreshToken()
        for key, value in profile.items():
            refresh[key] = value
            
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": profile
        })

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"success": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MeView(APIView):
    permission_classes = [IsAnyRole]

    def get(self, request):
        user = request.user
        return Response({
            "odoo_uid": user.odoo_uid,
            "name": user.name,
            "login": user.login,
            "email": user.email,
            "role": user.role,
            "partner_id": user.partner_id,
            "employee_id": user.employee_id,
            "parent_id": user.parent_id,
            "child_ids": user.child_ids,
            "department_id": user.department_id,
        })
