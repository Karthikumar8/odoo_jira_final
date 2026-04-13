from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from services.odoo_client import odoo_call
from .serializers import TaskSerializer
from accounts.permissions import IsManagerOrAbove, IsAnyRole

TASK_FIELDS = [
    "id", "name", "active", "color", "project_id", "stage_id", "state",
    "user_ids", "partner_id", "priority", "date_deadline", "planned_date_begin", "date_end",
    "allocated_hours", "effective_hours", "remaining_hours", "overtime",
    "progress", "description", "tag_ids", "parent_id", "child_ids",
    "depend_on_ids", "dependent_ids", "milestone_id", "recurring_task", "recurrence_id",
    "sale_line_id", "display_in_project", "rating_last_value", "access_token", "sequence"
]

class TaskViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyRole()]
        if self.action in ["create", "partial_update", "update", "destroy", "move"]:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def list(self, request):
        project_id = request.query_params.get("project_id")
        stage_id = request.query_params.get("stage_id")
        
        if not project_id:
            return Response({"error": "project_id is mandatory."}, status=status.HTTP_400_BAD_REQUEST)

        domain = [("active", "=", True), ("project_id", "=", int(project_id))]
        if stage_id:
            domain.append(("stage_id", "=", int(stage_id)))

        domain_list = [list(t) for t in domain]
        
        tasks = odoo_call("project.task", "search_read", [domain_list], {
            "fields": TASK_FIELDS, 
            "order": "sequence asc, priority desc"
        })
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        domain = [["id", "=", int(pk)]]
        tasks = odoo_call("project.task", "search_read", [domain], {"fields": TASK_FIELDS})
        if not tasks:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = TaskSerializer(tasks[0])
        return Response(serializer.data)

    def create(self, request):
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            new_id = odoo_call("project.task", "create", [payload])
            return Response({"id": new_id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        serializer = TaskSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            odoo_call("project.task", "write", [[int(pk)], payload])
            return Response({"id": int(pk)})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        odoo_call("project.task", "write", [[int(pk)], {"active": False}])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='move')
    def move(self, request, pk=None):
        stage_id = request.data.get("stage_id")
        sequence = request.data.get("sequence")
        
        if not stage_id:
            return Response({"error": "stage_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        payload = {"stage_id": int(stage_id)}
        if sequence is not None:
            payload["sequence"] = int(sequence)
            
        odoo_call("project.task", "write", [[int(pk)], payload])
        return Response({"id": int(pk), "stage_id": int(stage_id), "sequence": sequence})

class TaskMetadataViewSet(viewsets.ViewSet):
    permission_classes = [IsAnyRole]

    @action(detail=False, methods=['get'])
    def all(self, request):
        users = odoo_call("res.users", "search_read", [[("share", "=", False)]], {"fields": ["id", "name"]})
        tags = odoo_call("project.tags", "search_read", [[]], {"fields": ["id", "name", "color"]})
        return Response({
            "users": users,
            "tags": tags
        })
