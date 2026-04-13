from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from services.odoo_client import odoo_call
from accounts.permissions import IsAnyRole
from datetime import datetime, timedelta

class ReportingViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAnyRole]

    def _get_base_domain(self, request, model_type):
        user = request.user
        role = getattr(user, "role", "employee")
        uid = user.odoo_uid
        is_manager = role in ["manager", "superuser"]
        
        domain = []
        if not is_manager:
            if model_type == 'task':
                domain.append(["user_ids", "in", [uid]])
            elif model_type == 'timesheet':
                domain.append(["employee_id.user_id", "=", uid])
            elif model_type == 'project':
                domain.append("|")
                domain.append(["favorite_user_ids", "in", [uid]])
                domain.append(["user_id", "=", uid])
        return domain

    @action(detail=False, methods=['get'], url_path='task-analysis')
    def task_analysis(self, request):
        domain = [["active", "=", True]] + self._get_base_domain(request, 'task')
        
        try:
            stage_groups = odoo_call("project.task", "read_group", [], {
                "domain": domain, 
                "fields": ["stage_id"], 
                "groupby": ["stage_id"]
            })
        except Exception:
            stage_groups = []
            
        today_str = datetime.now().strftime("%Y-%m-%d")
        overdue_domain = domain + [["date_deadline", "<", today_str]]
        try:
            overdue_domain_fold = overdue_domain + [["stage_id.fold", "=", False]]
            overdue_tasks = odoo_call("project.task", "search_count", [overdue_domain_fold])
        except Exception:
            overdue_tasks = odoo_call("project.task", "search_count", [overdue_domain])
            
        stages = []
        for g in stage_groups:
            stage = g.get("stage_id")
            if stage:
                stages.append({"id": stage[0], "name": stage[1], "count": g.get("stage_id_count", g.get("__count", 0))})
            else:
                stages.append({"id": 0, "name": "Unassigned", "count": g.get("stage_id_count", g.get("__count", 0))})
                
        return Response({
            "stages": stages,
            "overdue_count": overdue_tasks
        })

    @action(detail=False, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request):
        period = request.query_params.get("period", "7")
        try:
            days = int(period)
        except ValueError:
            days = 7
            
        date_from = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        domain = self._get_base_domain(request, 'timesheet') + [["date", ">=", date_from]]
        domain.append(["project_id", "!=", False])

        try:
            groups = odoo_call("account.analytic.line", "read_group", [], {
                "domain": domain, 
                "fields": ["unit_amount", "employee_id"], 
                "groupby": ["employee_id"]
            })
        except Exception:
            groups = []
            
        leaderboard = []
        for g in groups:
            emp = g.get("employee_id")
            if emp:
                leaderboard.append({
                    "employee_id": emp[0],
                    "name": emp[1],
                    "hours": g.get("unit_amount", 0)
                })
                
        leaderboard = sorted(leaderboard, key=lambda x: x["hours"], reverse=True)[:10]
        
        return Response({"leaderboard": leaderboard})

    @action(detail=False, methods=['get'], url_path='project-health')
    def project_health(self, request):
        domain = [["active", "=", True]] + self._get_base_domain(request, 'project')
        
        try:
            projects_raw = odoo_call("project.project", "search_read", [domain], {
                "fields": [
                    "id", "name", "display_name",
                    "allocated_hours", "effective_hours",
                    "task_count", "progress",
                    "date_start", "date",
                    "user_id", "partner_id"
                ],
                "order": "name asc",
                "limit": 50
            })
        except Exception as e:
            return Response({"projects": [], "error": str(e)}, status=200)

        projects = []
        for p in projects_raw:
            allocated = p.get("allocated_hours") or 0
            effective = p.get("effective_hours") or 0
            # Compute usage % (how much of budget is consumed)
            usage_pct = round((effective / allocated) * 100, 1) if allocated > 0 else 0
            # Determine health status
            if usage_pct > 100:
                health_status = "over_budget"
            elif usage_pct > 85:
                health_status = "at_risk"
            else:
                health_status = "on_track"

            projects.append({
                "id": p.get("id"),
                "name": p.get("display_name") or p.get("name", "Unknown"),
                "allocated": allocated,
                "effective": effective,
                "usage_pct": usage_pct,
                "health_status": health_status,
                "task_count": p.get("task_count", 0),
                "progress": p.get("progress", 0),
                "manager": p["user_id"][1] if isinstance(p.get("user_id"), list) and p["user_id"] else None,
                "date_start": p.get("date_start"),
                "date_end": p.get("date"),
            })

        return Response({"projects": projects})


    @action(detail=False, methods=['get'], url_path='my-tasks')
    def my_tasks(self, request):
        uid = request.user.odoo_uid
        domain = [["active", "=", True], ["user_ids", "in", [uid]]]
        
        try:
            domain_fold = domain + [["stage_id.fold", "=", False]]
            groups = odoo_call("project.task", "read_group", [], {
                "domain": domain_fold,
                "fields": ["project_id"],
                "groupby": ["project_id"]
            })
        except Exception:
            groups = odoo_call("project.task", "read_group", [], {
                "domain": domain,
                "fields": ["project_id"],
                "groupby": ["project_id"]
            })
            
        tasks_summary = []
        for g in groups:
            proj = g.get("project_id")
            if proj:
                tasks_summary.append({
                    "project_id": proj[0],
                    "project_name": proj[1],
                    "count": g.get("project_id_count", g.get("__count", 0))
                })
            else:
                tasks_summary.append({
                    "project_id": 0,
                    "project_name": "Unassigned System Mapping",
                    "count": g.get("project_id_count", g.get("__count", 0))
                })
                
        return Response({"my_tasks": tasks_summary})
