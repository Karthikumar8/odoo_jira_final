from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from services.odoo_client import odoo_call
from .serializers import MilestoneSerializer
from accounts.permissions import IsManagerOrAbove, IsAnyRole
from datetime import datetime

MILESTONE_FIELDS = [
    "id", "name", "sequence", "project_id", "deadline", 
    "is_reached", "reached_date", "quantity_percentage", "task_ids"
]

class MilestoneViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyRole()]
        if self.action in ["create", "partial_update", "update", "destroy", "reach", "unreach"]:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def list(self, request):
        project_id = request.query_params.get("project_id")
        domain = []
        if project_id:
            domain.append(["project_id", "=", int(project_id)])
        else:
            return Response({"error": "project_id is mandatory."}, status=status.HTTP_400_BAD_REQUEST)

        domain.append(["active", "=", True])
        
        try:
            milestones = odoo_call("project.milestone", "search_read", [domain], {
                "fields": MILESTONE_FIELDS, 
                "order": "sequence asc"
            })
        except Exception:
            domain = [["project_id", "=", int(project_id)]]
            milestones = odoo_call("project.milestone", "search_read", [domain], {
                "fields": MILESTONE_FIELDS, 
                "order": "sequence asc"
            })

        serializer = MilestoneSerializer(milestones, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        domain = [["id", "=", int(pk)]]
        milestones = odoo_call("project.milestone", "search_read", [domain], {"fields": MILESTONE_FIELDS})
        if not milestones:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = MilestoneSerializer(milestones[0])
        return Response(serializer.data)

    def create(self, request):
        serializer = MilestoneSerializer(data=request.data)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            new_id = odoo_call("project.milestone", "create", [payload])
            return Response({"id": new_id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        serializer = MilestoneSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            odoo_call("project.milestone", "write", [[int(pk)], payload])
            return Response({"id": int(pk)})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            odoo_call("project.milestone", "write", [[int(pk)], {"active": False}])
        except Exception:
            odoo_call("project.milestone", "unlink", [[int(pk)]])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='reach')
    def reach(self, request, pk=None):
        payload = {
            "is_reached": True,
            "reached_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        odoo_call("project.milestone", "write", [[int(pk)], payload])
        return Response({"status": "success"})

    @action(detail=True, methods=['patch'], url_path='unreach')
    def unreach(self, request, pk=None):
        payload = {
            "is_reached": False,
            "reached_date": False
        }
        odoo_call("project.milestone", "write", [[int(pk)], payload])
        return Response({"status": "success"})
