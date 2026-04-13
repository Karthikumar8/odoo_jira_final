from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from services.odoo_client import odoo_call
from .serializers import TimesheetSerializer
from accounts.permissions import IsManagerOrAbove, IsAnyRole
from datetime import datetime, timedelta

TIMESHEET_FIELDS = [
    "id", "name", "date", "project_id", "task_id", 
    "employee_id", "user_id", "unit_amount", "amount"
]

class TimesheetViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "leaderboard", "partial_update"]:
            return [IsAnyRole()]
        if self.action in ["destroy"]:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def list(self, request):
        project_id = request.query_params.get("project_id")
        task_id = request.query_params.get("task_id")
        
        domain = []
        if task_id:
            domain.append(["task_id", "=", int(task_id)])
        elif project_id:
            domain.append(["project_id", "=", int(project_id)])
        else:
            return Response({"error": "task_id or project_id is mandatory."}, status=status.HTTP_400_BAD_REQUEST)

        timesheets = odoo_call("account.analytic.line", "search_read", [domain], {
            "fields": TIMESHEET_FIELDS, 
            "order": "date desc, id desc"
        })
        serializer = TimesheetSerializer(timesheets, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = TimesheetSerializer(data=request.data)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            
            if not payload.get("employee_id"):
                uid = request.user.odoo_uid
                employees = odoo_call("hr.employee", "search_read", [[["user_id", "=", uid]]], {"fields": ["id"]})
                if employees:
                    payload["employee_id"] = employees[0]["id"]
                else:
                    return Response({"error": "No employee linked to this user."}, status=status.HTTP_400_BAD_REQUEST)
            
            if "date" not in payload:
                payload["date"] = datetime.now().strftime("%Y-%m-%d")

            new_id = odoo_call("account.analytic.line", "create", [payload])
            return Response({"id": new_id}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        serializer = TimesheetSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            payload = serializer.to_odoo(serializer.validated_data)
            odoo_call("account.analytic.line", "write", [[int(pk)], payload])
            return Response({"id": int(pk)})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            odoo_call("account.analytic.line", "write", [[int(pk)], {"active": False}])
        except Exception:
            odoo_call("account.analytic.line", "unlink", [[int(pk)]])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        today = datetime.now()
        start_of_week = today - timedelta(days=today.weekday())
        start_date_str = start_of_week.strftime("%Y-%m-%d")
        
        domain = [["date", ">=", start_date_str]]
        timesheets = odoo_call("account.analytic.line", "search_read", [domain], {
            "fields": ["employee_id", "unit_amount"]
        })
        
        leaderboard = {}
        for ts in timesheets:
            emp = ts.get("employee_id")
            if emp and isinstance(emp, list):
                emp_id, emp_name = emp[0], emp[1]
                if emp_id not in leaderboard:
                    leaderboard[emp_id] = {"id": emp_id, "name": emp_name, "hours": 0}
                leaderboard[emp_id]["hours"] += ts.get("unit_amount", 0)
                
        result = sorted(leaderboard.values(), key=lambda x: x["hours"], reverse=True)
        return Response(result)
