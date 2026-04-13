from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from services.odoo_client import odoo_call
from .serializers import StageSerializer
from accounts.permissions import IsManagerOrAbove

STAGE_FIELDS = [
    "id", "name", "sequence", "fold", "color",
    "project_ids", "mail_template_id"
]

class StageViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "partial_update", "update", "destroy", "reorder"]:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def list(self, request):
        project_id = request.query_params.get("project_id")
        domain = []
        if project_id:
            domain.append(["project_ids", "in", [int(project_id)]])
        else:
            domain.append(["project_ids", "=", False])

        stages = odoo_call("project.task.type", "search_read", [domain], {"fields": STAGE_FIELDS, "order": "sequence asc"})
        serializer = StageSerializer(stages, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        domain = [["id", "=", int(pk)]]
        stages = odoo_call("project.task.type", "search_read", [domain], {"fields": STAGE_FIELDS})
        if not stages:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = StageSerializer(stages[0])
        return Response(serializer.data)

    def create(self, request):
        serializer = StageSerializer(data=request.data)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            new_id = odoo_call("project.task.type", "create", [payload])
            return Response({"id": new_id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        serializer = StageSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            odoo_call("project.task.type", "write", [[int(pk)], payload])
            return Response({"id": int(pk)})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        odoo_call("project.task.type", "write", [[int(pk)], {"active": False}])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['patch'], url_path='reorder')
    def reorder(self, request):
        stages_data = request.data.get("stages", [])
        if not stages_data:
            return Response({"error": "No stages provided."}, status=status.HTTP_400_BAD_REQUEST)
        
        for st in stages_data:
            if "id" in st and "sequence" in st:
                odoo_call("project.task.type", "write", [[int(st["id"])], {"sequence": int(st["sequence"])}])
        
        return Response({"status": "success"})
