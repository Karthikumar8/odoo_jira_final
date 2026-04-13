from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from services.odoo_client import odoo_call
from .serializers import ProjectSerializer
from accounts.permissions import IsManagerOrAbove

PROJECT_FIELDS = [
    "id", "name", "description", "partner_id", "user_id", "tag_ids",
    "date_start", "date", "allocated_hours", "effective_hours",
    "privacy_visibility", "allow_timesheets",
    "allow_milestones", "allow_task_dependencies", "allow_recurring_tasks",
    "stage_id", "task_count", "color", "company_id", "active"
]

class ProjectViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "partial_update", "update", "destroy"]:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def list(self, request):
        user = request.user
        domain = [["active", "=", True]]
        
        if user.role not in ["superuser", "manager"]:
            domain.append("|")
            domain.append(["favorite_user_ids", "in", [user.odoo_uid]])
            domain.append(["user_id", "=", user.odoo_uid])

        projects = odoo_call("project.project", "search_read", [domain], {"fields": PROJECT_FIELDS})
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        domain = [["id", "=", int(pk)]]
        projects = odoo_call("project.project", "search_read", [domain], {"fields": PROJECT_FIELDS})
        if not projects:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProjectSerializer(projects[0])
        return Response(serializer.data)

    def create(self, request):
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            new_id = odoo_call("project.project", "create", [payload])
            return Response({"id": new_id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        serializer = ProjectSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            odoo_call("project.project", "write", [[int(pk)], payload])
            return Response({"id": int(pk)})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        odoo_call("project.project", "write", [[int(pk)], {"active": False}])
        return Response(status=status.HTTP_204_NO_CONTENT)
        
    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        role = request.user.role if hasattr(request.user, "role") else "employee"
        uid = request.user.odoo_uid
        is_manager = role in ["manager", "superuser"]
        
        from datetime import datetime, timedelta
        today_str = datetime.now().strftime("%Y-%m-%d")
        week_ago_str = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        project_domain = [["active", "=", True]]
        task_domain = [["active", "=", True]]
        ts_domain = [["date", ">=", week_ago_str]]

        if not is_manager:
            task_domain.append(["user_ids", "in", [uid]])
            ts_domain.append(["employee_id.user_id", "=", uid])
        
        total_projects = odoo_call("project.project", "search_count", [project_domain])
        active_tasks = odoo_call("project.task", "search_count", [task_domain])

        overdue_domain = task_domain + [["date_deadline", "<", today_str], ["is_closed", "=", False]]
        try:
            overdue_tasks = odoo_call("project.task", "search_count", [overdue_domain])
        except Exception:
            overdue_domain = task_domain + [["date_deadline", "<", today_str]]
            overdue_tasks = odoo_call("project.task", "search_count", [overdue_domain])

        ts_group = odoo_call("account.analytic.line", "read_group", [], {"domain": ts_domain, "fields": ["unit_amount"], "groupby": []})
        total_hours = ts_group[0].get("unit_amount", 0) if ts_group else 0

        recent_projects = odoo_call("project.project", "search_read", [project_domain], {
            "fields": ["id", "name"], 
            "limit": 5, 
            "order": "create_date desc"
        })

        my_tasks_domain = [["active", "=", True], ["user_ids", "in", [uid]]]
        my_tasks = odoo_call("project.task", "search_read", [my_tasks_domain], {
            "fields": ["id", "name", "project_id", "date_deadline", "priority"], 
            "limit": 5, 
            "order": "date_deadline asc"
        })

        return Response({
            "total_projects": total_projects,
            "active_tasks": active_tasks,
            "overdue_tasks": overdue_tasks,
            "weekly_hours": total_hours,
            "recent_projects": recent_projects,
            "my_tasks": my_tasks
        })
