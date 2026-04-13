from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from services.odoo_client import odoo_call
from .serializers import ProjectUpdateSerializer
from accounts.permissions import IsManagerOrAbove, IsAnyRole
from datetime import datetime

UPDATE_FIELDS = [
    "id", "name", "date", "project_id", "user_id", "status", 
    "progress", "description"
]

class ProjectUpdateViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyRole()]
        if self.action in ["create", "partial_update", "update", "destroy"]:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def list(self, request):
        project_id = request.query_params.get("project_id")
        domain = []
        if project_id:
            domain.append(["project_id", "=", int(project_id)])
        else:
            return Response({"error": "project_id is mandatory."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            updates = odoo_call("project.update", "search_read", [domain], {
                "fields": UPDATE_FIELDS + ["allocated_time", "task_count", "closed_task_count", "timesheet_time"], 
                "order": "date desc, id desc"
            })
        except Exception:
            updates = odoo_call("project.update", "search_read", [domain], {
                "fields": UPDATE_FIELDS, 
                "order": "date desc, id desc"
            })

        serializer = ProjectUpdateSerializer(updates, many=True)
        return Response(serializer.data)

    def create(self, request):
        data = request.data.copy()
        if "user_id" not in data or not data["user_id"]:
            data["user_id"] = request.user.odoo_uid
        if "date" not in data or not data["date"]:
            data["date"] = datetime.now().strftime("%Y-%m-%d")
            
        serializer = ProjectUpdateSerializer(data=data)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            new_id = odoo_call("project.update", "create", [payload])
            return Response({"id": new_id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            odoo_call("project.update", "unlink", [[int(pk)]])
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)
